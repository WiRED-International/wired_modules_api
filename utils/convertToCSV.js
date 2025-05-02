export function convertToCSV(data) {
    if (!data || !data.length) {
      return '';
    }
  
    const headers = Object.keys(data[0]);
    const csvRows = [];
  
    // Add header row
    csvRows.push(headers.join(','));
  
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        // Escape quotes by double-quoting, and wrap field in quotes if it contains commas or quotes
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
  
    return csvRows.join('\n');
  }
  