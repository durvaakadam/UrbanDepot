import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './cssfiles/Ticket.css';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import emailjs from 'emailjs-com';
import { QRCodeCanvas } from 'qrcode.react'; // Update import

const Ticket = () => {
  const location = useLocation();
  const userEmail = localStorage.getItem("userEmail");
  const { 
    address = 'N/A', 
    place,
    paymentId, 
    reservationData, 
    totalAmount
  } = location.state || {};

  // Define EmailJS variables
  const emailJsServiceId = "service_47vx99l";
  const emailJsTemplateId = "template_ozillze";
  const emailJsUserId = "ekSsPejJYK6BBqm2F";

  useEffect(() => {
    console.log("Service ID:", emailJsServiceId);
    console.log("Template ID:", emailJsTemplateId);
    console.log("User ID:", emailJsUserId);

    if (userEmail) {
      console.log('Logged in user email:', userEmail);
    } else {
      console.log('No user is logged in.');
    }
  }, [userEmail]);

  const downloadPDF = async () => {
    const input = document.getElementById('ticket-container');
    const canvas = await html2canvas(input, { scale: 2 }); // Higher scale for better resolution
    const data = canvas.toDataURL('image/png');

    // Calculate the PDF dimensions based on the canvas size
    const pdfWidth = 400; // A4 width in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Scale height accordingly

    const pdf = new jsPDF('l', 'mm', [pdfWidth, pdfHeight]);

    // Add image to the PDF
    pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('ticket.pdf');
};


  const sendEmail = async () => {
    const templateParams = {
      to_email: reservationData.email,
      address: address,
      place: place,
      name: reservationData.name,
      vehicleType: reservationData.vehicleType,
      checkinDate: reservationData.checkinDate,
      checkoutDate: reservationData.checkoutDate,
      checkinTime: reservationData.checkinTime,
      checkoutTime: reservationData.checkoutTime,
      totalAmount: totalAmount,
      paymentId: paymentId,
    };
    console.log('Template parameters:', templateParams);
    
    try {
      const response = await emailjs.send(
        emailJsServiceId,
        emailJsTemplateId,
        templateParams,
        emailJsUserId
      );

      console.log('Email sent successfully!', response.status, response.text);
      alert("Email sent successfully!");
    } catch (err) {
      console.error('Failed to send email:', err);
      alert("Failed to send email.");
    }
  };

  return (
    <div className="ticket-wrapper">
      <div
        className="ticket-container"
        style={{ backgroundImage: `url("/ticket.png")` }}

        id="ticket-container"
      >
        <div className="left-section">
          <p className="ticket-title">{reservationData.name}</p>
          <p className="ticket-place"><strong>PLACE:</strong> {place}</p>
          <p className="ticket-address"><strong>ADDRESS:</strong> {address}</p>
        </div>
  
        {/* Details Section moved out of the ticket-container */}
        <div className="details-section">
          <p className="ticket-detail"><strong>Vehicle Type:</strong> {reservationData.vehicleType}</p>
          <p className="ticket-detail"><strong>Check-in:</strong> {reservationData.checkinDate} at {reservationData.checkinTime}</p>
          <p className="ticket-detail"><strong>Check-out:</strong> {reservationData.checkoutDate} at {reservationData.checkoutTime}</p>
        </div>
  
        {/* QR Code positioned within ticket container for better separation */}
        <div className="qr-code">
          <QRCodeCanvas
            value={`Thank you, ${reservationData.name}, for your reservation!\n\nPlace: ${place}\nAddress: ${address}\n\nVehicle: ${reservationData.vehicleType}\nCheck-in: ${reservationData.checkinDate} at ${reservationData.checkinTime}\nCheck-out: ${reservationData.checkoutDate} at ${reservationData.checkoutTime}\n\nPayment ID: ${paymentId}\nTotal: ₹${totalAmount}\n\nThank you for choosing URBANDEPOT!`}
            size={160}
            level="H"
          />
        </div>
  
        {/* Separate Total Paid section */}
        <div className="total-paid">
    <p className="ticket-detail" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
      <strong></strong> ₹{totalAmount}
    </p>
        </div>
      </div>
  
      {/* Button Container placed outside ticket-container */}
      <div className="button-container">
        <button className="ticket-button" onClick={downloadPDF}>
          Download Ticket PDF
        </button>
        <button className="ticket-button" onClick={sendEmail}>
          Send Ticket via Email
        </button>
      </div>
    </div>
  );
  
  
  
};

export default Ticket;


