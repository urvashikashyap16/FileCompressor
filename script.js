// Tab switching functionality
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show corresponding tab content
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-content`).classList.add('active');
    });
});

// Compress file upload handling
const fileUpload = document.getElementById('file-upload');
const fileName = document.getElementById('file-name');
const compressBtn = document.getElementById('compress-btn');

fileUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileName.textContent = `Selected file: ${e.target.files[0].name}`;
        compressBtn.disabled = false;
    } else {
        fileName.textContent = 'No file selected';
        compressBtn.disabled = true;
    }
});

// Decompress file upload handling
const compressedFileUpload = document.getElementById('compressed-file-upload');
const compressedFileName = document.getElementById('compressed-file-name');
const decompressBtn = document.getElementById('decompress-btn');

compressedFileUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        compressedFileName.textContent = `Selected file: ${e.target.files[0].name}`;
        decompressBtn.disabled = false;
    } else {
        compressedFileName.textContent = 'No file selected';
        decompressBtn.disabled = true;
    }
});

// Compress file functionality
compressBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Show spinner and hide download button
    document.getElementById('compress-spinner').style.display = 'block';
    document.getElementById('download-compressed').style.display = 'none';
    document.getElementById('compress-status').style.display = 'none';
    
    try {
        const response = await fetch('/api/compress', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Compression failed');
        }
        
        const result = await response.json();
        
        // Update stats
        document.getElementById('original-size').textContent = formatBytes(result.originalSize);
        document.getElementById('compressed-size').textContent = formatBytes(result.compressedSize);
        document.getElementById('compression-ratio').textContent = result.compressionRatio.toFixed(2) + '%';
        
        // Show download button
        const downloadBtn = document.getElementById('download-compressed');
        downloadBtn.href = `/api/download/${result.compressedFilePath.split('/').pop()}`;
        downloadBtn.style.display = 'inline-block';
        
        // Show success message
        const statusMsg = document.getElementById('compress-status');
        statusMsg.textContent = 'File compressed successfully!';
        statusMsg.className = 'status-message success';
        statusMsg.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        const statusMsg = document.getElementById('compress-status');
        statusMsg.textContent = 'Error compressing file. Please try again.';
        statusMsg.className = 'status-message error';
        statusMsg.style.display = 'block';
    } finally {
        document.getElementById('compress-spinner').style.display = 'none';
    }
});

// Decompress file functionality
decompressBtn.addEventListener('click', async () => {
    const file = compressedFileUpload.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Show spinner and hide download button
    document.getElementById('decompress-spinner').style.display = 'block';
    document.getElementById('download-decompressed').style.display = 'none';
    document.getElementById('decompress-status').style.display = 'none';
    
    try {
        const response = await fetch('/api/decompress', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Decompression failed');
        }
        
        const result = await response.json();
        
        // Get original filename without .bin extension
        const originalFilename = file.name.replace('.bin', '');
        
        // Show download button
        const downloadBtn = document.getElementById('download-decompressed');
        downloadBtn.href = `/api/download_decompressed/${result.decompressedFileName}`;
        downloadBtn.style.display = 'inline-block';
        
        // Show success message
        const statusMsg = document.getElementById('decompress-status');
        statusMsg.textContent = 'File decompressed successfully!';
        statusMsg.className = 'status-message success';
        statusMsg.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        const statusMsg = document.getElementById('decompress-status');
        statusMsg.textContent = 'Error decompressing file. Please try again.';
        statusMsg.className = 'status-message error';
        statusMsg.style.display = 'block';
    } finally {
        document.getElementById('decompress-spinner').style.display = 'none';
    }
});

// Huffman visualization
document.getElementById('visualize-btn').addEventListener('click', () => {
    const text = document.getElementById('sample-text').value;
    if (!text) {
        alert('Please enter some text to visualize');
        return;
    }
    
    // Clear previous tree
    const treeContainer = document.getElementById('tree-container');
    treeContainer.innerHTML = '';
    
    // Build Huffman tree
    const tree = buildHuffmanTree(text);
    
    // Visualize tree
    visualizeTree(tree, treeContainer);
});

// Function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Huffman tree implementation for visualization
class HuffmanNode {
    constructor(char, freq) {
        this.char = char;
        this.freq = freq;
        this.left = null;
        this.right = null;
    }
}

function buildHuffmanTree(text) {
    // Count frequency of each character
    const frequency = {};
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        frequency[char] = (frequency[char] || 0) + 1;
    }
    
    // Create a priority queue (array) of Huffman nodes
    const queue = [];
    for (const char in frequency) {
        queue.push(new HuffmanNode(char, frequency[char]));
    }
    
    // Sort queue by frequency
    queue.sort((a, b) => a.freq - b.freq);
    
    // Build Huffman Tree
    while (queue.length > 1) {
        const left = queue.shift();
        const right = queue.shift();
        
        const internal = new HuffmanNode(null, left.freq + right.freq);
        internal.left = left;
        internal.right = right;
        
        // Insert new node into queue at correct position
        let i = 0;
        while (i < queue.length && queue[i].freq < internal.freq) {
            i++;
        }
        queue.splice(i, 0, internal);
    }
    
    // Return root of Huffman Tree
    return queue[0];
}

function visualizeTree(tree, container) {
    if (!tree) {
        container.textContent = 'No tree to visualize. Try with different text.';
        return;
    }
    
    // Calculate positions for the tree nodes
    const positions = {};
    calculatePositions(tree, 0, 0, positions);
    
    // Scale factor to adjust the tree size
    const scaleFactor = 80;
    const verticalSpacing = 80;
    
    // Find min and max x to center the tree
    let minX = Infinity, maxX = -Infinity;
    for (const nodeId in positions) {
        const pos = positions[nodeId];
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
    }
    
    const offsetX = -minX * scaleFactor + 50;
    const offsetY = 50;
    
    // Render the tree
    renderNode(tree, container, positions, scaleFactor, verticalSpacing, offsetX, offsetY);
}

function calculatePositions(node, level, position, positions) {
    if (!node) return;
    
    // Generate a unique ID for the node
    const nodeId = Math.random().toString(36).substring(2, 9);
    
    // Store position
    positions[nodeId] = {
        node: node,
        x: position,
        y: level,
        id: nodeId
    };
    
    // Calculate positions for left and right children
    const spacing = Math.pow(2, 3 - level) / 2; // Adjust based on level
    if (node.left) calculatePositions(node.left, level + 1, position - spacing, positions);
    if (node.right) calculatePositions(node.right, level + 1, position + spacing, positions);
}

function renderNode(node, container, positions, scaleFactor, verticalSpacing, offsetX, offsetY) {
    if (!node) return;
    
    // Find this node's position
    let nodePos = null;
    for (const nodeId in positions) {
        if (positions[nodeId].node === node) {
            nodePos = positions[nodeId];
            break;
        }
    }
    
    if (!nodePos) return;
    
    // Create node element
    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.style.left = (nodePos.x * scaleFactor + offsetX) + 'px';
    nodeElement.style.top = (nodePos.y * verticalSpacing + offsetY) + 'px';
    
    // Display character and frequency
    const displayText = node.char ?
        `'${node.char === ' ' ? 'space' : node.char === '\n' ? '\\n' : node.char}': ${node.freq}` :
        `${node.freq}`;
    nodeElement.textContent = displayText;
    
    container.appendChild(nodeElement);
    
    // Draw lines to children
    if (node.left) {
        drawLine(container,
            nodePos.x * scaleFactor + offsetX + 30,
            nodePos.y * verticalSpacing + offsetY + 30,
            getChildPosition(node.left, positions).x * scaleFactor + offsetX + 30,
            getChildPosition(node.left, positions).y * verticalSpacing + offsetY + 30);
        renderNode(node.left, container, positions, scaleFactor, verticalSpacing, offsetX, offsetY);
    }
    
    if (node.right) {
        drawLine(container,
            nodePos.x * scaleFactor + offsetX + 30,
            nodePos.y * verticalSpacing + offsetY + 30,
            getChildPosition(node.right, positions).x * scaleFactor + offsetX + 30,
            getChildPosition(node.right, positions).y * verticalSpacing + offsetY + 30);
        renderNode(node.right, container, positions, scaleFactor, verticalSpacing, offsetX, offsetY);
    }
}

function getChildPosition(node, positions) {
    for (const nodeId in positions) {
        if (positions[nodeId].node === node) {
            return positions[nodeId];
        }
    }
    return { x: 0, y: 0 };
}

function drawLine(container, x1, y1, x2, y2) {
    const length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    const line = document.createElement('div');
    line.className = 'tree-line';
    line.style.width = length + 'px';
    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    
    container.appendChild(line);
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70, // Adjust for fixed navbar
                behavior: 'smooth'
            });
        }
    });
});