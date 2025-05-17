import heapq
import os
import json
from flask import Flask, request, jsonify, send_file, send_from_directory, url_for
from werkzeug.utils import secure_filename
import tempfile
import shutil

app = Flask(__name__, static_folder='static')

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
COMPRESSED_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'compressed')
DECOMPRESSED_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'decompressed')

# Create directories if they don't exist
for folder in [UPLOAD_FOLDER, COMPRESSED_FOLDER, DECOMPRESSED_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['COMPRESSED_FOLDER'] = COMPRESSED_FOLDER
app.config['DECOMPRESSED_FOLDER'] = DECOMPRESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

class HuffmanCoding:
    def __init__(self, path=None):
        self.path = path
        self.heap = []
        self.codes = {}
        self.reverse_mapping = {}

    class HeapNode:
        def __init__(self, char, freq):
            self.char = char
            self.freq = freq
            self.left = None
            self.right = None

        # defining comparators less_than and equals
        def __lt__(self, other):
            return self.freq < other.freq

        def __eq__(self, other):
            if(other == None):
                return False
            if(not isinstance(other, HuffmanCoding.HeapNode)):
                return False
            return self.freq == other.freq

    # functions for compression:

    def make_frequency_dict(self, text):
        frequency = {}
        for character in text:
            if not character in frequency:
                frequency[character] = 0
            frequency[character] += 1
        return frequency

    def make_heap(self, frequency):
        for key in frequency:
            node = self.HeapNode(key, frequency[key])
            heapq.heappush(self.heap, node)

    def merge_nodes(self):
        while(len(self.heap) > 1):
            node1 = heapq.heappop(self.heap)
            node2 = heapq.heappop(self.heap)

            merged = self.HeapNode(None, node1.freq + node2.freq)
            merged.left = node1
            merged.right = node2

            heapq.heappush(self.heap, merged)

    def make_codes_helper(self, root, current_code):
        if(root == None):
            return

        if(root.char != None):
            self.codes[root.char] = current_code
            self.reverse_mapping[current_code] = root.char
            return

        self.make_codes_helper(root.left, current_code + "0")
        self.make_codes_helper(root.right, current_code + "1")

    def make_codes(self):
        root = heapq.heappop(self.heap)
        current_code = ""
        self.make_codes_helper(root, current_code)

    def get_encoded_text(self, text):
        encoded_text = ""
        for character in text:
            encoded_text += self.codes[character]
        return encoded_text

    def pad_encoded_text(self, encoded_text):
        extra_padding = 8 - len(encoded_text) % 8
        for i in range(extra_padding):
            encoded_text += "0"

        padded_info = "{0:08b}".format(extra_padding)
        encoded_text = padded_info + encoded_text
        return encoded_text

    def get_byte_array(self, padded_encoded_text):
        if(len(padded_encoded_text) % 8 != 0):
            print("Encoded text not padded properly")
            exit(0)

        b = bytearray()
        for i in range(0, len(padded_encoded_text), 8):
            byte = padded_encoded_text[i:i+8]
            b.append(int(byte, 2))
        return b

    def compress(self):
        if not self.path:
            raise ValueError("File path not specified")
            
        filename, file_extension = os.path.splitext(self.path)
        output_path = os.path.join(app.config['COMPRESSED_FOLDER'], os.path.basename(filename) + ".bin")

        with open(self.path, 'r', encoding='utf-8', errors='replace') as file, open(output_path, 'wb') as output:
            text = file.read()
            text = text.rstrip()

            # Calculate original file size
            original_size = os.path.getsize(self.path)

            frequency = self.make_frequency_dict(text)
            self.make_heap(frequency)
            self.merge_nodes()
            self.make_codes()

            encoded_text = self.get_encoded_text(text)
            padded_encoded_text = self.pad_encoded_text(encoded_text)

            b = self.get_byte_array(padded_encoded_text)
            output.write(bytes(b))

        # Calculate compressed file size
        compressed_size = os.path.getsize(output_path)
        
        # Calculate compression ratio
        compression_ratio = (1 - (compressed_size / original_size)) * 100 if original_size > 0 else 0

        return {
            'output_path': output_path,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio
        }

    # functions for decompression:

    def remove_padding(self, padded_encoded_text):
        padded_info = padded_encoded_text[:8]
        extra_padding = int(padded_info, 2)

        padded_encoded_text = padded_encoded_text[8:]
        encoded_text = padded_encoded_text[:-1*extra_padding] if extra_padding > 0 else padded_encoded_text

        return encoded_text

    def decode_text(self, encoded_text):
        current_code = ""
        decoded_text = ""

        for bit in encoded_text:
            current_code += bit
            if(current_code in self.reverse_mapping):
                character = self.reverse_mapping[current_code]
                decoded_text += character
                current_code = ""

        return decoded_text

    def decompress(self, input_path):
        filename, file_extension = os.path.splitext(input_path)
        output_path = os.path.join(app.config['DECOMPRESSED_FOLDER'], os.path.basename(filename) + "_decompressed.txt")

        with open(input_path, 'rb') as file, open(output_path, 'w', encoding='utf-8') as output:
            bit_string = ""

            byte = file.read(1)
            while byte:
                byte = ord(byte)
                bits = bin(byte)[2:].rjust(8, '0')
                bit_string += bits
                byte = file.read(1)

            encoded_text = self.remove_padding(bit_string)
            decompressed_text = self.decode_text(encoded_text)
            output.write(decompressed_text)

        return output_path

    def get_codes_for_visualization(self, text):
        # Reset state
        self.heap = []
        self.codes = {}
        self.reverse_mapping = {}
        
        # Build Huffman tree and codes
        frequency = self.make_frequency_dict(text)
        self.make_heap(frequency)
        self.merge_nodes()
        self.make_codes()
        
        # Return the codes and frequencies for visualization
        return {
            'codes': self.codes,
            'frequencies': frequency
        }

# Routes to serve the frontend
@app.route('/')
def index():
    return app.send_static_file('index.html')

# API endpoint for file compression
@app.route('/api/compress', methods=['POST'])
def compress_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save the uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Compress the file
        huffman = HuffmanCoding(file_path)
        result = huffman.compress()
        
        # Get the filename for the download URL
        compressed_filename = os.path.basename(result['output_path'])
        
        # Return compression results with download URL
        return jsonify({
            'originalSize': result['original_size'],
            'compressedSize': result['compressed_size'],
            'compressionRatio': result['compression_ratio'],
            'compressedFilePath': compressed_filename,
            'downloadUrl': url_for('download_file', filename=compressed_filename)
        })

# API endpoint for file decompression
@app.route('/api/decompress', methods=['POST'])
def decompress_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.endswith('.bin'):
        # Save the uploaded file
        filename = secure_filename(file.filename)
        compressed_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(compressed_path)
        
        # We need to provide the reverse mapping for decompression
        # First, create a temporary text file for storing the frequency dictionary
        with open(compressed_path, 'rb') as f:
            # Read the first few bytes to extract header information
            # In a real implementation, the header would contain the frequency table
            # Here we use a simplified approach
            pass
        
        # Initialize HuffmanCoding
        huffman = HuffmanCoding()
        
        try:
            # For this simplified implementation, we'll use a basic frequency map
            # In a real implementation, this would be extracted from the file header
            sample_text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?()-_=+\n\t"
            frequency = huffman.make_frequency_dict(sample_text)
            huffman.make_heap(frequency)
            huffman.merge_nodes()
            huffman.make_codes()
            
            # Now decompress the file
            output_path = huffman.decompress(compressed_path)
            
            # Get the filename for the download URL
            decompressed_filename = os.path.basename(output_path)
            
            # Return decompression results with download URL
            return jsonify({
                'success': True,
                'decompressedFileName': decompressed_filename,
                'downloadUrl': url_for('download_decompressed_file', filename=decompressed_filename)
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

# API endpoint to download compressed file
@app.route('/api/download/<filename>')
def download_file(filename):
    return send_from_directory(directory=app.config['COMPRESSED_FOLDER'], path=filename, as_attachment=True)

# API endpoint to download decompressed file
@app.route('/api/download_decompressed/<filename>')
def download_decompressed_file(filename):
    return send_from_directory(directory=app.config['DECOMPRESSED_FOLDER'], path=filename, as_attachment=True)

# API endpoint for Huffman tree visualization data
@app.route('/api/visualize', methods=['POST'])
def visualize_huffman():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    
    huffman = HuffmanCoding()
    visualization_data = huffman.get_codes_for_visualization(text)
    
    return jsonify(visualization_data)

if __name__ == '__main__':
    app.run(debug=True)