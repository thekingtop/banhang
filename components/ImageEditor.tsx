import React, { useState, useRef, useEffect } from 'react';
import { AppState, Preset } from '../types';
import { removeBackground, compositeImages, compositeProductOnly } from '../services/geminiService';
import Spinner from './common/Spinner';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';

interface ImageEditorProps {
  appState: AppState;
  updateAppState: (newState: Partial<AppState>) => void;
}

const PRESETS: Preset[] = [
    { name: 'Bình thường', style: 'saturate-100 contrast-100' },
    { name: 'Nóng & Giòn', style: 'saturate-150 contrast-125 brightness-110' },
    { name: 'Vị cay', style: 'saturate-200 contrast-110 hue-rotate-[-10deg]' },
    { name: 'Tươi & Ngon', style: 'saturate-125 contrast-105 brightness-105' },
    { name: 'Nâu đỏ', style: 'sepia-100' },
    { name: 'Trắng đen', style: 'grayscale-100' },
    { name: 'Cổ điển', style: 'sepia-50 contrast-125 brightness-90 saturate-125' },
    { name: 'Tương phản cao', style: 'contrast-150 saturate-110' },
];

const BACKGROUND_SUGGESTIONS = [
    'Một gian bếp nhà hàng hiện đại, sạch sẽ và sáng sủa.',
    'Một quán ăn đường phố sôi động về đêm ở Sài Gòn, với nhiều ánh đèn neon.',
    'Một bàn ăn bằng gỗ mộc mạc trong một khu vườn xanh mát.',
    'Bối cảnh tối giản với nền màu xám và ánh sáng studio chuyên nghiệp.'
];

const CAMERA_ANGLES = [
    { name: 'Toàn cảnh', value: 'wide' },
    { name: 'Trung cảnh', value: 'medium' },
    { name: 'Cận cảnh', value: 'close-up' },
];

const CHARACTER_POSES = [
    'Đứng',
    'Ngồi',
    'Đang cầm sản phẩm',
    'Đang giới thiệu sản phẩm'
];

const CHARACTER_COSTUMES = [
    'Giữ nguyên',
    'Trang phục đầu bếp',
    'Trang phục thường ngày'
];

const CROP_RATIOS = [
  { name: 'Gốc', value: null },
  { name: 'Vuông (1:1)', value: '1 / 1' },
  { name: 'Dọc (4:5)', value: '4 / 5' },
  { name: 'Story (9:16)', value: '9 / 16' },
  { name: 'Ngang (16:9)', value: '16 / 9' },
];

type EditMode = 'removeBg' | 'composite';

const ImageEditor: React.FC<ImageEditorProps> = ({ appState, updateAppState }) => {
    const { originalImage, originalImages, editedImage, editedImages, userPrompt } = appState;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Edit mode
    const [editMode, setEditMode] = useState<EditMode>('removeBg');

    // Product image states
    const [selectedProductFiles, setSelectedProductFiles] = useState<File[] | null>(null);
    const productFileInputRef = useRef<HTMLInputElement>(null);

    // Character image states
    const [selectedCharacterFile, setSelectedCharacterFile] = useState<File | null>(null);
    const [characterImage, setCharacterImage] = useState<string | null>(null);
    const characterFileInputRef = useRef<HTMLInputElement>(null);
    
    // Active image for batch
    const [activeIndex, setActiveIndex] = useState(0);

    // Settings states
    const [preserveFace, setPreserveFace] = useState(true);
    const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[1].name);
    const [characterPose, setCharacterPose] = useState(CHARACTER_POSES[0]);
    const [characterCostume, setCharacterCostume] = useState(CHARACTER_COSTUMES[0]);
    const [activePreset, setActivePreset] = useState<string>(PRESETS[0].style);
    const [backgroundDescription, setBackgroundDescription] = useState(BACKGROUND_SUGGESTIONS[0]);
    
    // Cropping states
    const [cropAspectRatio, setCropAspectRatio] = useState<string | null>(null);
    const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number; boxX: number; boxY: number } | null>(null);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const calculateCropBox = () => {
        if (!cropAspectRatio || !imageRef.current) {
            setCropBox(null);
            return;
        }

        const { clientWidth: imgDispWidth, clientHeight: imgDispHeight } = imageRef.current;
        if(imgDispWidth === 0 || imgDispHeight === 0) return;

        const [ratioW, ratioH] = cropAspectRatio.split(' / ').map(Number);
        const targetAspectRatio = ratioW / ratioH;

        let newWidth, newHeight;

        if (imgDispWidth / imgDispHeight > targetAspectRatio) {
            newHeight = imgDispHeight;
            newWidth = newHeight * targetAspectRatio;
        } else {
            newWidth = imgDispWidth;
            newHeight = newWidth / targetAspectRatio;
        }

        const newX = (imgDispWidth - newWidth) / 2;
        const newY = (imgDispHeight - newHeight) / 2;

        setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    };
    
    useEffect(() => {
        calculateCropBox();
    }, [cropAspectRatio, editedImage, originalImage]);


    const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!cropBox) return;
        e.preventDefault();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setDragStart({
            x: clientX,
            y: clientY,
            boxX: cropBox.x,
            boxY: cropBox.y,
        });
        setIsDragging(true);
    };
    
    useEffect(() => {
        const handleDragMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !dragStart || !cropBox || !imageRef.current) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - dragStart.x;
            const deltaY = clientY - dragStart.y;
            
            let newX = dragStart.boxX + deltaX;
            let newY = dragStart.boxY + deltaY;

            const { clientWidth: imgDispWidth, clientHeight: imgDispHeight } = imageRef.current;
            newX = Math.max(0, Math.min(newX, imgDispWidth - cropBox.width));
            newY = Math.max(0, Math.min(newY, imgDispHeight - cropBox.height));

            setCropBox(prev => prev ? { ...prev, x: newX, y: newY } : null);
        };

        const handleDragEnd = () => {
            setIsDragging(false);
            setDragStart(null);
        };
        
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };

    }, [isDragging, dragStart, cropBox]);


    const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileList = Array.from(files);
            setSelectedProductFiles(fileList);

            const filePromises = fileList.map(file => {
                return new Promise<string>((resolve, reject) => {
                    // FIX: Add a guard to ensure the item is a valid Blob/File. This prevents
                    // the runtime error described, where an empty object might be processed.
                    if (!(file instanceof Blob)) {
                        return reject(new Error('An invalid file was selected.'));
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises).then(urls => {
                 updateAppState({
                    originalImages: urls,
                    originalImage: urls[0],
                    editedImage: null,
                    editedImages: null,
                });
                setActiveIndex(0);
            }).catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to read files.');
                console.error(err);
            });
        }
    };

    const handleCharacterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // FIX: Add a guard to ensure the item is a valid Blob/File for consistency and safety.
            if (!(file instanceof Blob)) {
                setError('The selected character image is not a valid file.');
                return;
            }
            setSelectedCharacterFile(file);
            setEditMode('composite'); // Automatically switch to composite mode
            const reader = new FileReader();
            reader.onload = (event) => {
                setCharacterImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleThumbnailClick = (index: number) => {
        if (!originalImages) return;
        setActiveIndex(index);
        updateAppState({
            originalImage: originalImages[index],
            editedImage: editedImages ? (editedImages[index] || null) : null
        });
    }

    const handleEdit = async () => {
        if (!selectedProductFiles || selectedProductFiles.length === 0) {
            setError('Vui lòng chọn ảnh sản phẩm trước.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            let resultsBase64: string[] = [];
            if (editMode === 'composite') {
                if(selectedProductFiles.length > 1) {
                    setError("Chế độ Ghép ảnh chỉ hỗ trợ một ảnh tại một thời điểm. Chỉ ảnh đầu tiên được xử lý.");
                }
                const firstProductFile = selectedProductFiles[0];
                if (selectedCharacterFile) {
                    resultsBase64 = await compositeImages(
                        firstProductFile,
                        selectedCharacterFile,
                        backgroundDescription,
                        cameraAngle,
                        characterPose,
                        characterCostume,
                        userPrompt
                    );
                } else {
                    resultsBase64 = await compositeProductOnly(
                        firstProductFile,
                        backgroundDescription,
                        cameraAngle,
                        userPrompt
                    );
                }
            } else { // removeBg
                if (selectedProductFiles.length > 1) {
                    // Batch mode: 1 result per image
                    const promises = selectedProductFiles.map(file => removeBackground(file, preserveFace, 1));
                    const nestedResults = await Promise.all(promises);
                    resultsBase64 = nestedResults.flat();
                } else {
                    // Single image mode: 8 variants
                    resultsBase64 = await removeBackground(selectedProductFiles[0], preserveFace, 8);
                }
            }
            const imageDataUrls = resultsBase64.map(base64 => `data:image/png;base64,${base64}`);
            updateAppState({ 
                editedImages: imageDataUrls,
                editedImage: imageDataUrls[0] // Set the first one as the main preview
            });
            setActiveIndex(0);

        } catch (err) {
            const errorMessage = (err instanceof Error) ? err.message : 'Chỉnh sửa ảnh thất bại. Vui lòng thử lại.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getCssFilterString = (style: string): string => {
        return style.split(' ').map(cls => {
            if (cls.startsWith('hue-rotate-')) {
                const value = cls.substring('hue-rotate-'.length).replace('[', '').replace(']', '');
                return `hue-rotate(${value})`;
            }
            const lastDashIndex = cls.lastIndexOf('-');
            if (lastDashIndex === -1) return '';
            const filterName = cls.substring(0, lastDashIndex);
            const valueString = cls.substring(lastDashIndex + 1);
            const numericValue = parseFloat(valueString);
            if (isNaN(numericValue)) return '';
            return `${filterName}(${numericValue / 100})`;
        }).filter(Boolean).join(' ');
    };

    const downloadCurrentImage = () => {
        const canvas = canvasRef.current;
        const imageEl = imageRef.current;
        if (!canvas || !editedImage || !imageEl) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const finalImage = new Image();
        finalImage.crossOrigin = 'anonymous';
        finalImage.src = editedImage;

        finalImage.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.filter = getCssFilterString(activePreset);

            let sourceX = 0, sourceY = 0;
            let sourceWidth = finalImage.naturalWidth;
            let sourceHeight = finalImage.naturalHeight;

            if (cropBox && cropAspectRatio) {
                const { clientWidth: displayWidth, clientHeight: displayHeight } = imageEl;
                const { naturalWidth, naturalHeight } = finalImage;
                
                const scaleX = naturalWidth / displayWidth;
                const scaleY = naturalHeight / displayHeight;

                sourceX = cropBox.x * scaleX;
                sourceY = cropBox.y * scaleY;
                sourceWidth = cropBox.width * scaleX;
                sourceHeight = cropBox.height * scaleY;

                const [w, h] = cropAspectRatio.split(' / ').map(Number);
                let outputWidth, outputHeight;
                if (w > h) {
                    outputWidth = 1920;
                    outputHeight = outputWidth * (h / w);
                } else if (h > w) {
                    outputWidth = 1080;
                    outputHeight = outputWidth * (h / w);
                } else {
                    outputWidth = 1080;
                    outputHeight = 1080;
                }
                canvas.width = Math.round(outputWidth);
                canvas.height = Math.round(outputHeight);

            } else {
                canvas.width = sourceWidth;
                canvas.height = sourceHeight;
            }

            ctx.drawImage(finalImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
            
            const link = document.createElement('a');
            link.download = `dishboost-ai-edited-${cropAspectRatio ? cropAspectRatio.replace(' / ', 'x') : 'original'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            ctx.filter = 'none';
        };
    };

    const downloadAllImages = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !editedImages || editedImages.length < 1) return;

        for (let i = 0; i < editedImages.length; i++) {
            const imageUrl = editedImages[i];
            const filename = `dishboost-ai-batch-${i + 1}.png`;

            const promise = new Promise<void>((resolve, reject) => {
                const tempImage = new Image();
                tempImage.crossOrigin = 'anonymous';
                tempImage.src = imageUrl;

                tempImage.onload = () => {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject();
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.filter = getCssFilterString(activePreset);

                    let sourceX = 0, sourceY = 0;
                    let sourceWidth = tempImage.naturalWidth;
                    let sourceHeight = tempImage.naturalHeight;

                    if (cropAspectRatio) {
                        const [ratioW, ratioH] = cropAspectRatio.split(' / ').map(Number);
                        const targetAspectRatio = ratioW / ratioH;
                        const naturalAspectRatio = tempImage.naturalWidth / tempImage.naturalHeight;
                        
                        if (naturalAspectRatio > targetAspectRatio) {
                            sourceHeight = tempImage.naturalHeight;
                            sourceWidth = sourceHeight * targetAspectRatio;
                            sourceX = (tempImage.naturalWidth - sourceWidth) / 2;
                        } else {
                            sourceWidth = tempImage.naturalWidth;
                            sourceHeight = sourceWidth / targetAspectRatio;
                            sourceY = (tempImage.naturalHeight - sourceHeight) / 2;
                        }
                    }
                    
                    canvas.width = sourceWidth;
                    canvas.height = sourceHeight;

                    // Redraw with filter because changing canvas size clears it
                    ctx.filter = getCssFilterString(activePreset);
                    ctx.drawImage(tempImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
                    
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    ctx.filter = 'none';
                    resolve();
                };
                tempImage.onerror = () => reject();
            });

            try {
                await promise;
                await new Promise(resolve => setTimeout(resolve, 300)); // Add a small delay between downloads
            } catch (error) {
                console.error(`Failed to download image ${i+1}:`, error)
                setError(`Không thể tải xuống ảnh ${i+1}.`);
            }
        }
    };
    
    useEffect(() => {
        if(editedImage){
            updateAppState({generatedContent: ''}); // clear content when image changes
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editedImage]);

    const displayImage = editedImage || originalImage;
    const isBatchMode = selectedProductFiles && selectedProductFiles.length > 1;
    let buttonText = 'Tạo ảnh';
    if(editMode === 'composite') buttonText = isBatchMode ? 'Ghép ảnh (chỉ ảnh đầu tiên)' : 'Ghép ảnh (8 kết quả)';
    if(editMode === 'removeBg') buttonText = isBatchMode ? `Xóa nền (${selectedProductFiles.length} ảnh)` : 'Xóa nền (8 kết quả)';

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Trình chỉnh sửa ảnh món ăn</h2>
                <p className="text-gray-400 mt-2">Tải lên một hoặc nhiều ảnh, xóa nền, hoặc ghép vào bối cảnh. AI sẽ tạo ra các tùy chọn để bạn lựa chọn.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="bg-card p-6 rounded-xl space-y-6">
                    {/* Step 1 */}
                    <div className="space-y-4">
                        <label className="text-lg font-semibold text-white block">1. Tải ảnh lên</label>
                        <div className="bg-dark p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-300 mb-2">1a. Tải ảnh sản phẩm (Bắt buộc, có thể chọn nhiều ảnh)</p>
                             <div className="flex items-center space-x-4">
                                <input type="file" accept="image/*" multiple onChange={handleProductFileChange} ref={productFileInputRef} className="hidden" />
                                <button onClick={() => productFileInputRef.current?.click()} className="flex-grow bg-primary hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">
                                    Chọn ảnh sản phẩm
                                </button>
                                {originalImage && !isBatchMode && <img src={originalImage} alt="Sản phẩm" className="w-14 h-14 object-cover rounded-md" />}
                            </div>
                        </div>
                         {originalImages && originalImages.length > 1 && (
                            <div className="bg-dark p-2 rounded-lg">
                                <p className="text-sm text-gray-300 mb-2 px-1">{originalImages.length} ảnh đã được chọn. Nhấp để xem trước.</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {originalImages.map((src, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleThumbnailClick(index)}
                                            className={`w-full aspect-square object-cover rounded-md cursor-pointer border-2 transition-all p-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary ${
                                                activeIndex === index ? 'border-primary' : 'border-transparent hover:border-orange-400'
                                            }`}
                                        >
                                            <img src={src} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="bg-dark p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-300 mb-2">1b. Tải ảnh nhân vật (Tùy chọn, chỉ một ảnh)</p>
                             <div className="flex items-center space-x-4">
                                <input type="file" accept="image/*" onChange={handleCharacterFileChange} ref={characterFileInputRef} className="hidden" />
                                <button onClick={() => characterFileInputRef.current?.click()} className="flex-grow bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                                    Chọn ảnh nhân vật
                                </button>
                                {characterImage && (
                                    <div className="relative group">
                                        <img src={characterImage} alt="Nhân vật" className="w-14 h-14 object-cover rounded-md" />
                                        <button 
                                            onClick={() => {
                                                setSelectedCharacterFile(null);
                                                setCharacterImage(null);
                                                if (characterFileInputRef.current) characterFileInputRef.current.value = "";
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                                            title="Xóa ảnh nhân vật"
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Step 2 */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3">2. Chế độ</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setEditMode('removeBg')} className={`p-3 rounded-lg text-center font-semibold transition-all ${editMode === 'removeBg' ? 'bg-primary text-white' : 'bg-dark hover:bg-gray-700 text-gray-300'}`}>
                                Xóa nền
                            </button>
                             <button onClick={() => setEditMode('composite')} className={`p-3 rounded-lg text-center font-semibold transition-all ${editMode === 'composite' ? 'bg-primary text-white' : 'bg-dark hover:bg-gray-700 text-gray-300'}`}>
                                Ghép ảnh
                            </button>
                        </div>
                    </div>

                    {/* Step 3 */}
                     <div className="space-y-4">
                        <label className="text-lg font-semibold text-white block">3. Tùy chỉnh & Tạo ảnh</label>
                        {editMode === 'composite' && (
                            <div className="bg-dark p-3 rounded-lg space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">Mô tả bối cảnh</label>
                                    <textarea
                                        rows={3}
                                        value={backgroundDescription}
                                        onChange={(e) => setBackgroundDescription(e.target.value)}
                                        className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                                        placeholder="Ví dụ: một quán ăn đường phố sôi động về đêm..."
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {BACKGROUND_SUGGESTIONS.map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onClick={() => setBackgroundDescription(suggestion)}
                                                className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-300 px-3 py-1 rounded-full"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="camera-angle" className="text-sm font-medium text-gray-300 block mb-2">Góc chụp</label>
                                    <select id="camera-angle" value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                                    {CAMERA_ANGLES.map(angle => <option key={angle.value} value={angle.name}>{angle.name}</option>)}
                                    </select>
                                </div>

                                {!!selectedCharacterFile && (
                                    <>
                                        <div>
                                            <label htmlFor="character-pose" className="text-sm font-medium text-gray-300 block mb-2">Tư thế Nhân vật</label>
                                            <select id="character-pose" value={characterPose} onChange={(e) => setCharacterPose(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                                                {CHARACTER_POSES.map(pose => <option key={pose} value={pose}>{pose}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="character-costume" className="text-sm font-medium text-gray-300 block mb-2">Trang phục Nhân vật</label>
                                            <select id="character-costume" value={characterCostume} onChange={(e) => setCharacterCostume(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary">
                                                {CHARACTER_COSTUMES.map(costume => <option key={costume} value={costume}>{costume}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                
                                <div>
                                    <label htmlFor="user-prompt" className="text-sm font-medium text-gray-300 block mb-2">Mô tả thêm (Tùy chọn)</label>
                                    <textarea
                                        id="user-prompt"
                                        rows={2}
                                        value={userPrompt}
                                        onChange={(e) => updateAppState({ userPrompt: e.target.value })}
                                        className="w-full bg-gray-700 p-2 rounded-lg border border-gray-600 focus:ring-primary focus:border-primary"
                                        placeholder="Ví dụ: sản phẩm đặt trên bàn gỗ, ánh nắng chiều..."
                                    />
                                </div>
                            </div>
                        )}
                        {(editMode === 'removeBg' || !!selectedCharacterFile) && (
                            <div className="flex items-center justify-between bg-dark p-3 rounded-lg">
                                <label htmlFor="preserve-face" className="flex items-center cursor-pointer">
                                    <input id="preserve-face" type="checkbox" checked={preserveFace} onChange={(e) => setPreserveFace(e.target.checked)} className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-primary focus:ring-primary"/>
                                    <span className="ml-3 text-gray-300">Giữ lại khuôn mặt (Chính xác 100%)</span>
                                </label>
                            </div>
                        )}
                        <button onClick={handleEdit} disabled={isLoading || !originalImage} className="w-full mt-2 bg-secondary disabled:bg-gray-600 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center">
                            {isLoading ? <Spinner /> : buttonText}
                        </button>
                        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                    </div>
                    {/* Step 4 & 5 */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">4. Hoàn thiện & Tải xuống</h3>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">Bộ lọc màu</label>
                            <div className="flex flex-wrap gap-3">
                                {PRESETS.map(preset => (
                                    <button key={preset.name} onClick={() => setActivePreset(preset.style)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activePreset === preset.style ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{preset.name}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">Cắt ảnh theo tỷ lệ</label>
                             <div className="flex flex-wrap gap-3">
                                {CROP_RATIOS.map(ratio => (
                                    <button 
                                        key={ratio.name} 
                                        onClick={() => setCropAspectRatio(ratio.value)} 
                                        disabled={!displayImage}
                                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cropAspectRatio === ratio.value ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                            {ratio.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={downloadCurrentImage} disabled={!editedImage || isLoading} className="w-full bg-green-600 disabled:bg-gray-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                               <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Tải ảnh đã chọn
                            </button>
                            <button onClick={downloadAllImages} disabled={!editedImages || editedImages.length <= 1 || isLoading} className="w-full bg-sky-600 disabled:bg-gray-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center">
                               <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Tải xuống tất cả
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="bg-card p-4 rounded-xl flex flex-col items-center justify-start min-h-[400px] lg:min-h-0 space-y-4">
                    <div
                        ref={imageContainerRef}
                        className="relative w-full max-w-lg mx-auto rounded-lg overflow-hidden flex items-center justify-center checkerboard-bg"
                    >
                        {isLoading && <div className="absolute inset-0 bg-dark/70 flex items-center justify-center z-20"><Spinner large /></div>}
                        
                        {!displayImage && <div className="h-64 flex items-center justify-center text-gray-500">Bản xem trước hình ảnh sẽ xuất hiện ở đây</div>}

                        {displayImage && (
                             <>
                                <img
                                    ref={imageRef}
                                    src={displayImage}
                                    alt="Xem trước"
                                    onLoad={calculateCropBox}
                                    style={{
                                        filter: getCssFilterString(activePreset),
                                    }}
                                    className="max-w-full max-h-[60vh] object-contain transition-all duration-300 block"
                                />
                                {cropBox && (
                                    <div
                                        onMouseDown={handleDragStart}
                                        onTouchStart={handleDragStart}
                                        style={{
                                            position: 'absolute',
                                            left: `${cropBox.x}px`,
                                            top: `${cropBox.y}px`,
                                            width: `${cropBox.width}px`,
                                            height: `${cropBox.height}px`,
                                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                                            border: '1px solid rgba(255, 255, 255, 0.7)',
                                            cursor: isDragging ? 'grabbing' : 'move',
                                        }}
                                    >
                                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40"></div>
                                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40"></div>
                                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40"></div>
                                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40"></div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    
                    {editedImages && editedImages.length > 0 && (
                        <div className="w-full max-w-lg">
                            <h3 className="text-lg font-semibold text-white mb-3 text-center">
                                {isBatchMode ? 'Chọn ảnh để xem trước và tinh chỉnh' : 'Chọn ảnh bạn thích nhất'}
                            </h3>
                            <div className={`grid gap-2 bg-dark p-2 rounded-lg ${isBatchMode ? 'grid-cols-4 md:grid-cols-5' : 'grid-cols-4'}`}>
                                {editedImages.map((imgSrc, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleThumbnailClick(index)}
                                        className={`w-full aspect-square object-cover rounded-md cursor-pointer border-2 transition-all p-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary ${
                                            editedImage === imgSrc ? 'border-primary' : 'border-transparent hover:border-orange-400'
                                        }`}
                                    >
                                      <img
                                        src={imgSrc}
                                        alt={`Kết quả ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;