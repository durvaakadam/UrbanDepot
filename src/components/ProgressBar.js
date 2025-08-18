// import React from 'react';
// import './cssfiles/ProgressBar.css';

// const ProgressBar = ({ currentStep, totalSteps, onNext, onPrev }) => {
//   // Calculate the progress percentage based on currentStep and totalSteps
//   const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

//   return (
//     <div className="progress-bar-container">
//       <div className="road">
//         {/* Progress bar that fills based on progressPercentage */}
//         <div
//           className="progress"
//           style={{ width: `${progressPercentage}%` }}
//         ></div>

//         {/* Moving car GIF */}
//         <img
//           src="car-video.gif"
//           alt="Moving car"
//           className="car-gif"
//           style={{ left: `calc(${progressPercentage}% - 45px)` }} // Adjust position as needed
//         />
      

//         {/* Parking spot at the end of the road */}
//         <div class="parking-spot-container">
//         <div class="parking-sign">P</div>
//         <div className="parking-spot"></div>
//         </div>
//             </div>

//       {/* Navigation buttons */}
//       <div className="button-container">
//         <button className="prev-button" onClick={onPrev} disabled={currentStep === 1}>
//           Previous
//         </button>
//         <button className="next-button" onClick={onNext} disabled={currentStep === totalSteps}>
//           Next
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProgressBar;




import React from 'react';
import './cssfiles/ProgressBar.css';

const ProgressBar = ({ currentStep, totalSteps, onNext, onPrev, onSubmit }) => {
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="progress-bar-container">
      <div className="road">
        <div
          className="progress"
          style={{ width: `${progressPercentage}%` }}
        ></div>

        <img
          src="car-video.gif"
          alt="Moving car"
          className="car-gif"
          style={{ left: `calc(${progressPercentage}% - 45px)` }}
        />

        <div className="parking-spot-container">
          <div className="parking-sign">P</div>
          <div className="parking-spot"></div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="button-container">
        <button
          className="prev-button"
          onClick={onPrev}
          disabled={currentStep === 1}
        >
          Previous
        </button>

        {currentStep === totalSteps ? (
          <button
            type="button"
            className="next-button"
            onClick={onSubmit}
          >
            Submit
          </button>
        ) : (
          <button
            className="next-button"
            onClick={onNext}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};


export default ProgressBar;