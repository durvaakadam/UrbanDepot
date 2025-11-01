import React, { useState, useEffect } from "react";
import "./cssfiles/FileUpload.css";

const uploadIcon = './drag-and-drop.png';
const FileUpload = ({ onFileChange, label, required, id, existingFileUrl, existingFileName }) => {
  const [files, setFiles] = useState([]);
  const [hasExistingFile, setHasExistingFile] = useState(false);

  // Handle existing file URL
  useEffect(() => {
    if (existingFileUrl && existingFileName) {
      setHasExistingFile(true);
      setFiles([]);
    } else {
      setHasExistingFile(false);
    }
  }, [existingFileUrl, existingFileName]);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", droppedFiles);
    setFiles(droppedFiles);
    setHasExistingFile(false);
    if (droppedFiles.length > 0) {
      handleFileChange(droppedFiles[0], id);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileChange = (file, id) => {
    if (file) {
      console.log(`File received in ${id}:`, file);
      setFiles([file]);
      setHasExistingFile(false);
      onFileChange(file, id);
    } else {
      console.error("No file was passed to handleFileChange.");
    }
  };

  const renderFilePreview = (file) => {
    if (file.type.startsWith("image/")) {
      return <img src={URL.createObjectURL(file)} alt={file.name} className="preview-img" />;
    } else if (file.type === "application/pdf") {
      return (
        <div className="pdf-preview">
          <i className="fa fa-file-pdf-o" aria-hidden="true"></i> {/* PDF icon */}
          <a href={URL.createObjectURL(file)} target="_blank" rel="noopener noreferrer" className="file-name">
            {file.name}
          </a>
        </div>
      );
    } else {
      return <span className="file-name">{file.name}</span>;
    }
  };

  const renderExistingFilePreview = () => {
    return (
      <div className="existing-file-preview">
        <div className="pdf-preview">
          <i className="fa fa-file-pdf-o" aria-hidden="true"></i>
          <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="file-name">
            {existingFileName}
          </a>
        </div>
        <div className="existing-file-indicator">
          <i className="fas fa-check-circle"></i>
          <span>Existing document</span>
        </div>
        <button 
          type="button" 
          className="change-file-btn"
          onClick={(e) => {
            e.stopPropagation();
            setHasExistingFile(false);
            setFiles([]);
          }}
        >
          Upload New File
        </button>
      </div>
    );
  };

  return (
    <div className="file-upload">
      <label>{label}{required && '*'}</label>
      <div
        className="drop-box"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !hasExistingFile && document.getElementById(`fileInput_${id}`).click()}
      >
       {hasExistingFile ? (
          renderExistingFilePreview()
        ) : files.length === 0 ? (
          <div className="upload-placeholder">
            <img src={uploadIcon} alt="Upload" className="upload-icon" /> {/* Use the PNG icon */}
            <span className="upload-text">Drag and drop here</span>
          </div>
        ) : (
          <div className="preview-section">
            {files.map((file, index) => (
              <div key={index} className="file-preview">
                {renderFilePreview(file)}
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          id={`fileInput_${id}`}
          onChange={(e) => handleFileChange(e.target.files[0], id)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default FileUpload;