'use client';

import { useMutation } from 'convex/react';
import { Camera, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../../../../convex/_generated/api';
import { tryCatch } from '../../../../../../lib/tryCatch';

interface ProfilePictureUploadProps {
    currentImage?: string;
    userName?: string;
}

export default function ProfilePictureUpload({
    currentImage,
    userName,
}: ProfilePictureUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const generateUploadUrl = useMutation(
        api.userFunctions.generateUserProfilePictureUploadUrl
    );
    const updateProfilePicture = useMutation(
        api.userFunctions.updateUserProfilePicture
    );
    const deleteProfilePicture = useMutation(
        api.userFunctions.deleteUserProfilePicture
    );

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setErrorMessage('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            setErrorMessage('File size must be less than 5MB');
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        setIsUploading(true);

        const { data: uploadUrl, error: urlError } = await tryCatch(
            generateUploadUrl()
        );

        if (urlError) {
            setErrorMessage('Failed to generate upload URL');
            setIsUploading(false);
            return;
        }

        // Upload file to Convex storage
        const { data: uploadResponse, error: uploadError } = await tryCatch(
            fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            })
        );

        if (uploadError || !uploadResponse?.ok) {
            setErrorMessage('Failed to upload image');
            setIsUploading(false);
            return;
        }

        // Extract storageId from response
        const { storageId } = await uploadResponse.json();

        // Update user profile with new image URL
        const { error: updateError } = await tryCatch(
            updateProfilePicture({ storageId })
        );

        if (updateError) {
            setErrorMessage('Failed to update profile picture');
        } else {
            setSuccessMessage('Profile picture updated successfully');
        }

        setIsUploading(false);
    };

    const handleRemovePicture = async () => {
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsUploading(true);

        const { error } = await tryCatch(deleteProfilePicture());

        if (error) {
            setErrorMessage('Failed to remove profile picture');
        } else {
            setSuccessMessage('Profile picture removed');
        }

        setIsUploading(false);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Card className="p-6 md:col-span-1 flex flex-col items-center gap-4">
            <Avatar className="size-24">
                <AvatarImage
                    src={currentImage ?? undefined}
                    alt={userName ?? 'User'}
                />
                <AvatarFallback>
                    {(userName ?? 'U').slice(0, 1)}
                </AvatarFallback>
            </Avatar>

            <div className="text-center">
                <div className="text-xl font-heading">
                    {userName ?? 'Your Account'}
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
                <Button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    variant="neutral"
                    size="sm"
                    className="w-full"
                >
                    {isUploading ? (
                        <>
                            <Upload className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Camera className="mr-2 h-4 w-4" />
                            Upload Picture
                        </>
                    )}
                </Button>

            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {errorMessage && (
                <p className="text-sm text-red-500 text-center">{errorMessage}</p>
            )}
            {successMessage && (
                <p className="text-sm text-green-600 text-center">{successMessage}</p>
            )}
        </Card>
    );
}
