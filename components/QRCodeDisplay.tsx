
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value }) => {
  return (
    <div className="p-4 bg-gray-100 rounded-lg flex flex-col items-center">
       <QRCodeSVG value={value} size={256} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} includeMargin={false} />
      <span className="mt-4 text-xs font-mono break-all bg-white px-2 py-1 rounded">{value}</span>
    </div>
  );
};

export default QRCodeDisplay;
