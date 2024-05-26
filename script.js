function embedMessageInBMP(bmpArrayBuffer, message) {
    const bmpData = new Uint8Array(bmpArrayBuffer);

    // Додати символ кінця повідомлення (null-термінатор)
    message += '\0';

    const messageBits = [];
    for (let i = 0; i < message.length; i++) {
        let charCode = message.charCodeAt(i);
        for (let j = 0; j < 8; j++) {
            messageBits.push((charCode >> j) & 1);
        }
    }

    let messageIndex = 0;
    for (let i = 54; i < bmpData.length && messageIndex < messageBits.length; i++) {
        bmpData[i] = (bmpData[i] & 0xFE) | messageBits[messageIndex];
        messageIndex++;
    }

    return bmpData.buffer;
}

function downloadArrayBufferAsFile(arrayBuffer, filename) {
    const blob = new Blob([arrayBuffer], { type: 'image/bmp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function extractMessageFromBMP(bmpArrayBuffer) {
    const bmpData = new Uint8Array(bmpArrayBuffer);

    const messageBits = [];
    for (let i = 54; i < bmpData.length; i++) {
        messageBits.push(bmpData[i] & 1);
    }

    let message = '';
    for (let i = 0; i < messageBits.length; i += 8) {
        let charCode = 0;
        for (let j = 0; j < 8; j++) {
            charCode |= (messageBits[i + j] << j);
        }
        if (charCode === 0) break; // Null-terminated string
        message += String.fromCharCode(charCode);
    }

    return message;
}
function readAndSetupBitmap(inputFile, callback) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const buffer = event.target.result;
        const view = new DataView(buffer);

        const width = view.getUint32(18, true);
        const height = view.getUint32(22, true);
        const depth = view.getUint16(28, true);

        const fileHeaderSize = 14;
        const dibHeaderSize = 40;
        const rowSize =  Math.ceil(width * 3 / 4) * 4; 
        const pixelArraySize = rowSize * height;
        const fileSize = view.getUint32(2, true);
        const pixelArrayOffset = view.getUint32(10, true);

        const newBuffer = new ArrayBuffer(fileSize);
        const newView = new DataView(newBuffer);

        // Header
        newView.setUint16(0, 0x4D42, true);
        newView.setUint32(2, fileSize, true);
        newView.setUint32(10, pixelArrayOffset, true);

        // DIB header
        newView.setUint32(14, dibHeaderSize, true);
        newView.setUint32(18, width, true);
        newView.setUint32(22, height, true); // Positive to store from bottom to top
        newView.setUint16(26, 1, true); // Number of color planes
        newView.setUint16(28, 24, true); // Bits per pixel
        newView.setUint32(34, pixelArraySize, true);

        callback(newView, pixelArrayOffset, width, height, rowSize);
    };

    reader.readAsArrayBuffer(inputFile);
}
function colorGradientBlueToGreen(x, y, width, height, isWhite) {
    const colorValue = Math.floor((x / width) * 255);
    const green = isWhite ? colorValue : 0;
    const blue = isWhite ? 0 : colorValue;
    return { blue, green, red: 0 };
}

function colorBlackAndWhite(x, y, width, height, isWhite) {
    const colorValue = isWhite ? 255 : 0;
    return { blue: colorValue, green: colorValue, red: colorValue };
}

function colorRandom(x, y, width, height, isWhite) {

   const colorValue = Math.floor((x / width) * 255);
    const red = isWhite ? colorValue : 0;
    const green = isWhite ? colorValue : 255 - colorValue;
    const blue = 255 - colorValue;
    return { red, green, blue };
}

function generateCheckerboardBitmap(colorCombination) {
    const input = document.getElementById('inputFile');
    if (!input.files[0]) {
        alert('Please select a BMP file first.');
        return;
    }

    readAndSetupBitmap(input.files[0], function (newView, pixelArrayOffset, width, height, rowSize) {
        const tileSize = 50;
        let offset = pixelArrayOffset;

        let colorFunction;
        switch (colorCombination) {
            case 1:
                colorFunction = colorGradientBlueToGreen;
                break;
            case 2:
                colorFunction = colorBlackAndWhite;
                break;
            case 3:
                colorFunction = colorRandom;
                break;
            default:
                colorFunction = colorGradientBlueToGreen;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isWhite = Math.floor(y / tileSize) % 2 === Math.floor(x / tileSize) % 2;
                const color = colorFunction(x, y, width, height, isWhite);

                newView.setUint8(offset, color.blue);   
                newView.setUint8(offset + 1, color.green); 
                newView.setUint8(offset + 2, color.red);   
                offset += 3;
            }
            offset += rowSize - width * 3;
        }

        const message = document.getElementById('message').value;
        const newArrayBuffer = embedMessageInBMP(newView.buffer, message);

        downloadArrayBufferAsFile(newArrayBuffer, "checkerboard_with_message.bmp");
    });
}

function generateCircleBitmap(colorCombination) {
    const input = document.getElementById('inputFile');
    if (!input.files[0]) {
        alert('Please select a BMP file first.');
        return;
    }

    readAndSetupBitmap(input.files[0], function (newView, pixelArrayOffset, width, height, rowSize) {
        const circleRadius = 25; 
        let offset = pixelArrayOffset;

        let colorFunction;
        switch (colorCombination) {
            case 1:
                colorFunction = colorGradientBlueToGreen;
                break;
            case 2:
                colorFunction = colorBlackAndWhite;
                break;
            case 3:
                colorFunction = colorRandom;
                break;
            default:
                colorFunction = colorGradientBlueToGreen;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Перевіряємо, чи поточний піксель знаходиться в межах кільця
                const dx = x - width / 2;
                const dy = y - height / 2;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Чи кільце вказує на білий чи чорний колір
                const isWhite = distance % (2 * circleRadius) <= circleRadius;

                const color = colorFunction(x, y, width, height, isWhite);

                newView.setUint8(offset, color.blue);   // Blue
                newView.setUint8(offset + 1, color.green); // Green
                newView.setUint8(offset + 2, color.red);   // Red
                offset += 3;
            }
            offset += rowSize - width * 3;
        }

        const message = document.getElementById('message').value;
        const newArrayBuffer = embedMessageInBMP(newView.buffer, message);

        downloadArrayBufferAsFile(newArrayBuffer, "circle_with_message.bmp");
    });
}

function generateWavesBitmap(colorCombination) {
    const input = document.getElementById('inputFile');
    if (!input.files[0]) {
        alert('Please select a BMP file first.');
        return;
    }

    readAndSetupBitmap(input.files[0], function (newView, pixelArrayOffset, width, height, rowSize) {
        const frequency = 0.9; // Adjust this for the frequency of waves
        let offset = pixelArrayOffset;

        let colorFunction;
        switch (colorCombination) {
            case 1:
                colorFunction = colorGradientBlueToGreen;
                break;
            case 2:
                colorFunction = colorBlackAndWhite;
                break;
            case 3:
                colorFunction = colorRandom;
                break;
            default:
                colorFunction = colorGradientBlueToGreen;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const waveValue = Math.sin((x + y * width) * frequency); // Calculate wave value
                const isWhite = waveValue > 0; // Depending on wave value, set color

                const color = colorFunction(x, y, width, height, isWhite);

                newView.setUint8(offset, color.blue);   // Blue
                newView.setUint8(offset + 1, color.green); // Green
                newView.setUint8(offset + 2, color.red);   // Red
                offset += 3;
            }
            offset += rowSize - width * 3;
        }
        const message = document.getElementById('message').value;
        const newArrayBuffer = embedMessageInBMP(newView.buffer, message);

        downloadArrayBufferAsFile(newArrayBuffer, "waves_with_message.bmp");

    });
}

    
    function extractMessage() {
        const fileInput = document.getElementById('inputFile');
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function() {
                const bmpArrayBuffer = reader.result;
                const message = extractMessageFromBMP(bmpArrayBuffer);
                alert('Extracted message: ' + message)
                console.log('Extracted message:', message);
            };
            reader.readAsArrayBuffer(file);
    }
    

function createBMP(){
    generateCheckerboardBitmap(3);

    // generateWavesBitmap(3);

    // generateCircleBitmap(3);
}




