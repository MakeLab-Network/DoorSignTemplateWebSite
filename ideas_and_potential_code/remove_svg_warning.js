/**
 * Removes a specified pattern (warning) from an SVG string.
 *
 * @param {string} svgString The original SVG content as a string.
 * @param {RegExp} warningRegex A regular expression that matches the warning to be removed.
 * @returns {string} The SVG string with the warning removed.
 */
function removeWarningFromSvg(svgString, warningRegex) {
  if (typeof svgString !== 'string') {
    console.error('SVG content must be a string.');
    return svgString; // Or throw an error
  }
  if (!(warningRegex instanceof RegExp)) {
    console.error('Provided regex is not a valid RegExp object.');
    return svgString; // Or throw an error
  }
  return svgString.replace(warningRegex, '');
}

/**
 * Triggers a browser download for the given content.
 *
 * @param {string} content The content to be downloaded.
 * @param {string} fileName The name for the downloaded file.
 * @param {string} mimeType The MIME type of the content (e.g., 'image/svg+xml').
 */
function downloadContent(content, fileName, mimeType = 'image/svg+xml') {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(link.href); // Free up memory
}

// Example of how you might use these functions:
/*
function handleDownload() {
  // Assume getOriginalSvgString() is a function that retrieves your SVG
  // For example, from a textarea, a JavaScript variable, or via fetch()
  const originalSvgString = getOriginalSvgString(); 

  // IMPORTANT: Define the regex to specifically match your warning.
  // This regex targets the multi-line warning comment with clear start/end markers:
  const warningRegex = /<!--[\s\S]*?WARNING: AUTO-GENERATED FILE - START[\s\S]*?WARNING: AUTO-GENERATED FILE - END[\s\S]*?-->/g;

  if (!originalSvgString) {
    console.error("Could not get original SVG string.");
    return;
  }

  const cleanedSvgString = removeWarningFromSvg(originalSvgString, warningRegex);
  downloadContent(cleanedSvgString, 'edited_door_sign.svg');
}

// You would call handleDownload() when the user clicks a download button, for example.
// document.getElementById('downloadButton').addEventListener('click', handleDownload);
*/ 