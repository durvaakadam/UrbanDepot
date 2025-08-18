import React, { useState } from "react";
import "./cssfiles/FileUpload.css";

const uploadIcon = './drag-and-drop.png';
const FileUpload = ({ onFileChange, label, required, id }) => {
  const [files, setFiles] = useState([]);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", droppedFiles);
    setFiles(droppedFiles);
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

  return (
    <div className="file-upload">
      <label>{label}{required && '*'}</label>
      <div
        className="drop-box"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById(`fileInput_${id}`).click()}
      >
       {files.length === 0 ? (
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