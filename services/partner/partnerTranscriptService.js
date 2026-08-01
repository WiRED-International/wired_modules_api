class PartnerTranscriptService {
  /**
   * Returns the transcript for a single learner.
   */
  static async getStudentTranscript(userId) {
    throw new Error("Not implemented");
  }

  /**
   * Returns transcripts for every learner in a class.
   */
  static async getClassTranscripts(classId) {
    throw new Error("Not implemented");
  }
}

module.exports = PartnerTranscriptService;