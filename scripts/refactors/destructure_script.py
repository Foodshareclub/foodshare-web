import re

with open("src/components/modals/PublishListingModal.tsx", "r") as f:
    content = f.read()

# Replace `const imageUpload = useImageUpload({` with destructured version
destructure_str = """  const {
    images,
    imageError,
    isCompressing,
    isDragOver,
    draggedImageId,
    inputFileRef,
    removeImage,
    handleChangeFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    onFileInputClick,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDragEnd,
    initializeFromProduct,
    clearImages
  } = useImageUpload({"""

content = re.sub(
    r"const imageUpload = useImageUpload\(\{",
    destructure_str,
    content,
    count=1
)

# Replace all `imageUpload.XYZ` with `XYZ`
content = re.sub(r"imageUpload\.([a-zA-Z0-9_]+)", r"\1", content)

# Remove the line `const fileInputRef = inputFileRef;` if we added it earlier (wait, earlier it was `const fileInputRef = imageUpload.inputFileRef;`)
content = content.replace("  const fileInputRef = inputFileRef;\n", "")
content = content.replace("  const fileInputRef = imageUpload.inputFileRef;\n", "")

with open("src/components/modals/PublishListingModal.tsx", "w") as f:
    f.write(content)
