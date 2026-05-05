/**
 * Universal Export Engine Utility
 * Converts JSON data to CSV and triggers a browser download.
 */

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    console.warn("EXPORT_ERROR: No data to export.");
    return;
  }

  // 1. Extract Headers (Flattened keys)
  const headers = Object.keys(data[0]);
  
  // 2. Build CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(fieldName => {
        let value = row[fieldName];
        
        // Handle nested objects (simple stringification)
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        
        // Escape commas and quotes for CSV safety
        const stringValue = String(value ?? '').replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
    })
  ].join('\r\n');

  // 3. Create Blob and Trigger Download
  const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
