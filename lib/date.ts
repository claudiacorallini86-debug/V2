/**
 * Formats a date string safely, handling invalid or missing dates.
 * @param dateStr The date string to format
 * @param includeTime Whether to include hours and minutes
 * @returns A formatted date string or a fallback indicator
 */
export function formatDate(dateStr?: string | null, includeTime = false): string {
  if (!dateStr) return 'N/D';
  
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    // Try to handle YYYY-MM-DD HH:mm format which might fail in some JS environments if not ISO
    const fallback = dateStr.replace(' ', 'T');
    const retryDate = new Date(fallback);
    if (!isNaN(retryDate.getTime())) {
      return format(retryDate, includeTime);
    }
    return 'Data non valida';
  }
  
  return format(date, includeTime);
}

function format(date: Date, includeTime: boolean): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('it-IT', options).format(date);
}
