const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

/**
 * Extract text content from PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} - Object containing extracted text and metadata
 */
const extractPdfText = async (filePath) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file not found');
    }

    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF and extract text
    const data = await pdfParse(dataBuffer);
    
    return {
      success: true,
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
        version: data.version
      }
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error.message,
      text: null
    };
  }
};

/**
 * Clean and format extracted PDF text
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
const cleanPdfText = (text) => {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page breaks and form feeds
    .replace(/\f/g, '\n')
    // Remove multiple consecutive newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Trim whitespace
    .trim();
};

/**
 * Process PDF file and extract readable content
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} - Processed PDF data
 */
const processPdfFile = async (filePath) => {
  try {
    const extractionResult = await extractPdfText(filePath);
    
    if (!extractionResult.success) {
      return extractionResult;
    }
    
    const cleanedText = cleanPdfText(extractionResult.text);
    
    return {
      success: true,
      text: cleanedText,
      metadata: extractionResult.metadata,
      wordCount: cleanedText.split(/\s+/).length,
      characterCount: cleanedText.length
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      success: false,
      error: error.message,
      text: null
    };
  }
};

/**
 * Delete uploaded file after processing
 * @param {string} filePath - Path to the file to delete
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error('File cleanup error:', error);
  }
};

module.exports = {
  extractPdfText,
  cleanPdfText,
  processPdfFile,
  cleanupFile
};