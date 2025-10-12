// pdfParserService.js
// Modular PDF parsing service for extracting text, images, and basic structure from PDFs
// Uses pdf-parse for text, pdfjs-dist for images and structure

import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Extracts text, images, and basic structure from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<Object>} - Parsed PDF data as JSON
 */
export async function parsePDF(filePath) {
  // Read file buffer
  const dataBuffer = fs.readFileSync(filePath);

  // Extract text using pdf-parse (CommonJS require)
  const textData = await pdfParse(dataBuffer);

  // Extract images and structure using pdfjs-dist
  const doc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
  const numPages = doc.numPages;
  let pages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);

    // Extract text content blocks
    const textContent = await page.getTextContent();
    const blocks = textContent.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      fontSize: item.height,
    }));

    // Extract images (basic metadata)
    let images = [];
    const ops = await page.getOperatorList();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        images.push({
          index: i,
          args: ops.argsArray[i],
          page: pageNum,
        });
      }
    }

    // Simple heuristic for possible tables
    let possibleTables = [];
    if (blocks.length > 1) {
      const rows = {};
      blocks.forEach(b => {
        const yKey = Math.round(b.y);
        if (!rows[yKey]) rows[yKey] = [];
        rows[yKey].push(b.str);
      });
      for (const y in rows) {
        if (rows[y].length > 2) {
          possibleTables.push({ row: y, cells: rows[y] });
        }
      }
    }

    pages.push({
      pageNum,
      blocks,
      images,
      possibleTables,
    });
  }

  return {
    info: textData.info,
    metadata: textData.metadata,
    numPages,
    text: textData.text,
    pages,
  };
}
