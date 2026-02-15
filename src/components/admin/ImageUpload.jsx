import { useState, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function ImageUpload({ onUpload, defaultValue = '' }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(defaultValue);

    // Sync preview when defaultValue changes (e.g. switching between items in modal)
    useEffect(() => {
        setPreview(defaultValue);
    }, [defaultValue]);

    async function handleUpload(e) {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setPreview(publicUrl);
            onUpload(publicUrl);
        } catch (error) {
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    function clearImage() {
        setPreview('');
        onUpload('');
    }

    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Imagen / Logo</label>

            {preview ? (
                <div className="relative w-full h-40 bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden group">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-xs text-gray-400 font-black uppercase italic tracking-tighter">Click para subir foto</p>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            )}
        </div>
    );
}
