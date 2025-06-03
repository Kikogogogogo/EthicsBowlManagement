import React from 'react';
import ethicsBowlIcon from '../assets/EthicsBowl.png';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg h-16 flex items-center px-6">
      {/* Logo/Icon and Title on the left */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg">
          <img
            src={ethicsBowlIcon}
            alt="Ethics Bowl Logo"
            className="h-8 w-8 object-contain"
          />
        </div>
        <h1 className="text-white font-bold text-xl tracking-wide">
          Ethics Bowl
        </h1>
      </div>
    </header>
  );
} 