const router = require('express').Router();
const fetchModuleList = require('../../../services/modules/fetchModuleList');

const { Op } = require('sequelize');
const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');
const {
  Modules,
  CmeCreditAwards,
  QuizScores,
} = require('../../../models');
const {
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');
const { GetObjectAttributesCommand } = require('@aws-sdk/client-s3');

const {
  s3Client,
  healthMapBucket,
} = require('../../../services/s3/s3Client');

const createModuleUploadUrl = require('../../../services/s3/createModuleUploadUrl');

// Retrieve active and archived modules for Super Admins
router.get(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const modules = await fetchModuleList({
        subcategoryId: req.query.subcategoryId,
        type: req.query.type,
        includeArchived: true,
      });

      return res.status(200).json(modules);
    } catch (err) {
      console.error('Error fetching administrative modules:', err);

      return res.status(500).json({
        message: 'Unable to retrieve modules.',
      });
    }
  }
);

router.post(
  '/upload-url',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { fileName, contentType } = req.body;

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({
          message: 'A file name is required.',
        });
      }

      if (!fileName.toLowerCase().endsWith('.zip')) {
        return res.status(400).json({
          message: 'Only ZIP module packages can be uploaded.',
        });
      }

      const upload = await createModuleUploadUrl({
        fileName,
        contentType: contentType || 'application/zip',
      });

      res.status(200).json(upload);
    } catch (err) {
      console.error('Error creating module upload URL:', err);

      res.status(500).json({
        message: 'Unable to create module upload URL.',
      });
    }
  }
);

// Generate an upload URL for replacing an existing module ZIP
router.post(
  '/:moduleId/replace-upload-url',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { fileName, contentType } = req.body;

      if (!fileName || typeof fileName !== 'string' ||
          !fileName.toLowerCase().endsWith('.zip')) {
        return res.status(400).json({
          message: 'A ZIP file is required.',
        });
      }

      const module = await Modules.findByPk(moduleId);

      if (!module) {
        return res.status(404).json({
          message: 'Module not found.',
        });
      }

      if (!module.downloadLink) {
        return res.status(400).json({
          message: 'This module does not have an existing ZIP to replace.',
        });
      }

      const { healthMapBucket, region, moduleZipPrefix } =
        require('../../../services/s3/s3Client');

      const expectedPrefix =
        `https://${healthMapBucket}.s3.${region}.amazonaws.com/`;

      if (!module.downloadLink.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: 'The existing module ZIP is not in the configured S3 bucket.',
        });
      }

      const existingKey = module.downloadLink.slice(expectedPrefix.length);

      if (
        !existingKey.startsWith(moduleZipPrefix) ||
        !existingKey.toLowerCase().endsWith('.zip') ||
        existingKey.includes('..')
      ) {
        return res.status(400).json({
          message: 'The existing module ZIP has an invalid S3 key.',
        });
      }

      const uploadId = randomUUID();

      const upload = await createModuleUploadUrl({
        fileName,
        contentType: contentType || 'application/zip',
        existingKey,
        uploadId,
      });

      return res.status(200).json({
        ...upload,
        uploadId,
      });
    } catch (err) {
      console.error('Error creating replacement ZIP upload URL:', err);

      return res.status(500).json({
        message: 'Unable to create replacement ZIP upload URL.',
      });
    }
  }
);

// Confirm that a replacement ZIP was uploaded successfully
router.post(
  '/:moduleId/confirm-replacement',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { uploadId, key: replacementKey } = req.body;

      if (typeof uploadId !== 'string' || !uploadId.trim()) {
        return res.status(400).json({
          message: 'A valid upload identifier is required.',
        });
      }

      const module = await Modules.findByPk(moduleId);

      if (!module) {
        return res.status(404).json({
          message: 'Module not found.',
        });
      }

      if (!module.downloadLink) {
        return res.status(400).json({
          message: 'Module has no existing ZIP.',
        });
      }

      const { region, moduleZipPrefix } =
        require('../../../services/s3/s3Client');

      const expectedPrefix =
        `https://${healthMapBucket}.s3.${region}.amazonaws.com/`;

      if (!module.downloadLink.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: 'Module ZIP is not in the configured S3 bucket.',
        });
      }

      const key = module.downloadLink.slice(expectedPrefix.length);

      if (
        !key.startsWith(moduleZipPrefix) ||
        !key.toLowerCase().endsWith('.zip') ||
        key.includes('..')
      ) {
        return res.status(400).json({
          message: 'Invalid module ZIP key.',
        });
      }

      if (
        typeof replacementKey !== 'string' ||
        !replacementKey.startsWith(moduleZipPrefix) ||
        !replacementKey.endsWith(`_${uploadId}.zip`) ||
        !replacementKey.toLowerCase().endsWith('.zip') ||
        replacementKey.includes('..') ||
        replacementKey === key
      ) {
        return res.status(400).json({
          message: 'Invalid replacement ZIP key.',
        });
      }

      const object = await s3Client.send(
        new HeadObjectCommand({
          Bucket: healthMapBucket,
          Key: replacementKey,
        })
      );

      if (object.Metadata?.uploadid !== uploadId) {
        return res.status(409).json({
          message: 'Replacement ZIP upload could not be verified.',
        });
      }

      if (!Number.isSafeInteger(object.ContentLength) ||
          object.ContentLength <= 0) {
        return res.status(400).json({
          message: 'Replacement ZIP has an invalid size.',
        });
      }

      module.downloadLink = `${expectedPrefix}${replacementKey}`;
      module.packageSize = String(object.ContentLength);
      module.package_uploaded_at = new Date();

      await module.save();

      // Remove the original ZIP only after the database update succeeds.
      try {
        const otherModuleCount = await Modules.count({
          where: {
            downloadLink: `${expectedPrefix}${key}`,
            id: { [Op.ne]: module.id },
          },
        });

        if (otherModuleCount === 0) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: healthMapBucket,
              Key: key,
            })
          );
        }
      } catch (cleanupError) {
        console.error(
          'Replacement saved, but old ZIP cleanup failed:',
          cleanupError
        );
      }

      return res.status(200).json({
        message: 'Module ZIP replacement confirmed.',
        packageSize: module.packageSize,
        package_uploaded_at: module.package_uploaded_at,
      });
    } catch (err) {
      console.error('Error confirming module ZIP replacement:', err);

      return res.status(500).json({
        message: 'Unable to confirm replacement ZIP.',
      });
    }
  }
);

// Permanently delete a module — historical-record protection
router.delete(
  '/:moduleId',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const { moduleId } = req.params;

      const module = await Modules.findByPk(moduleId);

      if (!module) {
        return res.status(404).json({
          message: 'Module not found.',
        });
      }

      if (!module.downloadLink) {
        return res.status(409).json({
          message: 'This module has no ZIP download link. Deletion was not performed.',
        });
      }

      const { region, moduleZipPrefix } =
        require('../../../services/s3/s3Client');

      const expectedPrefix =
        `https://${healthMapBucket}.s3.${region}.amazonaws.com/`;

      if (!module.downloadLink.startsWith(expectedPrefix)) {
        return res.status(400).json({
          message: 'Module ZIP is not in the configured S3 bucket.',
        });
      }

      const key = module.downloadLink.slice(expectedPrefix.length);

      if (
        !key.startsWith(moduleZipPrefix) ||
        !key.toLowerCase().endsWith('.zip') ||
        key.includes('..')
      ) {
        return res.status(400).json({
          message: 'Invalid module ZIP key.',
        });
      }

      // Database transaction framework.
      // No records are deleted until the deletion workflow is enabled.
      const transaction = await Modules.sequelize.transaction();

      try {
        // Lock the module record while checking deletion eligibility.
        const lockedModule = await Modules.findByPk(module.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!lockedModule) {
          await transaction.rollback();

          return res.status(404).json({
            message: 'Module no longer exists.',
          });
        }

        const [cmeAwardCount, quizScoreCount] = await Promise.all([
          CmeCreditAwards.count({
            where: { module_id: lockedModule.id },
            transaction,
          }),
          QuizScores.count({
            where: { module_id: lockedModule.id },
            transaction,
          }),
        ]);

        if (cmeAwardCount > 0 || quizScoreCount > 0) {
          await transaction.rollback();

          return res.status(409).json({
            message:
              'This module cannot be deleted because it has historical ' +
              'CME awards or student quiz scores.',
            cmeAwardCount,
            quizScoreCount,
          });
        }

        const redirectCount = await Modules.count({
          where: {
            redirect_module_id: lockedModule.id,
          },
          transaction,
        });

        if (redirectCount > 0) {
          await transaction.rollback();

          return res.status(409).json({
            message:
              'This module cannot be deleted because another module redirects to it.',
            redirectCount,
          });
        }

        const sharedZipCount = await Modules.count({
          where: {
            downloadLink: lockedModule.downloadLink,
            id: {
              [Op.ne]: lockedModule.id,
            },
          },
          transaction,
        });

        if (sharedZipCount > 0) {
          await transaction.rollback();

          return res.status(409).json({
            message:
              'This ZIP is referenced by another module and cannot be deleted.',
            sharedZipCount,
          });
        }

        // Save the S3 key before deleting the database record.
        const zipKey = key;

        // Delete the module and cascade its associated database records.
        await lockedModule.destroy({ transaction });
        await transaction.commit();

        // Remove the ZIP only after the database deletion succeeds.
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: healthMapBucket,
              Key: zipKey,
            })
          );
        } catch (s3Error) {
          console.error('Module deleted, but S3 cleanup failed:', s3Error);

          return res.status(207).json({
            message:
              'Module deleted from the database, but ZIP cleanup failed.',
            zipKey,
          });
        }

        return res.status(200).json({
          message: 'Module and ZIP deleted successfully.',
        });
      } catch (error) {
        if (!transaction.finished) {
          await transaction.rollback();
        }
        throw error;
      }
    } catch (err) {
      console.error('Error checking module deletion eligibility:', err);

      return res.status(500).json({
        message: 'Unable to check module deletion eligibility.',
      });
    }
  }
);

// ============================================
// Archive a module
// ============================================
router.patch(
  '/:moduleId/archive',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const module = await Modules.findByPk(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          message: 'Module not found.',
        });
      }

      if (module.is_archived) {
        return res.status(200).json({
          message: 'Module is already archived.',
          module,
        });
      }

      await module.update({ is_archived: true });

      return res.status(200).json({
        message: 'Module archived successfully.',
        module,
      });
    } catch (err) {
      console.error('Error archiving module:', err);

      return res.status(500).json({
        message: 'Unable to archive module.',
      });
    }
  }
);

// ============================================
// Restore an archived module
// ============================================
router.patch(
  '/:moduleId/restore',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const module = await Modules.findByPk(req.params.moduleId);

      if (!module) {
        return res.status(404).json({
          message: 'Module not found.',
        });
      }

      if (!module.is_archived) {
        return res.status(200).json({
          message: 'Module is already active.',
          module,
        });
      }

      await module.update({ is_archived: false });

      return res.status(200).json({
        message: 'Module restored successfully.',
        module,
      });
    } catch (err) {
      console.error('Error restoring module:', err);

      return res.status(500).json({
        message: 'Unable to restore module.',
      });
    }
  }
);

module.exports = router;