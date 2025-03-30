/**
 * Extract filename from a file path
 * @param filepath - Full path to the file
 * @returns The filename with extension
 */
export const getFilename = (filepath: string): string => {
  return filepath.split(/[\/\\]/).pop() || "Untitled.tex";
};
