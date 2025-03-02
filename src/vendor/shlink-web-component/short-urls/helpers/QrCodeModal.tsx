import { faFileDownload as downloadIcon } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'react-external-link';
import { Button, Modal, ModalBody, ModalHeader } from 'reactstrap';
import { TRACKING_PARAM } from '../../../../common/TrackingParam';
import type { FCWithDeps } from '../../container/utils';
import { componentFactory, useDependencies } from '../../container/utils';
import { useFeature } from '../../utils/features';
import type { QrErrorCorrection } from '../../utils/helpers/qrCodes';
import type { ImageDownloader } from '../../utils/services/ImageDownloader';
import type { ShortUrlModalProps } from '../data';
import { QrColorControl } from './qr-codes/QrColorControl';
import { QrDimensionControl } from './qr-codes/QrDimensionControl';
import { QrErrorCorrectionDropdown } from './qr-codes/QrErrorCorrectionDropdown';
import { QrTextControl } from './qr-codes/QrTextControl';
import './QrCodeModal.scss';

type QrCodeModalDeps = {
  ImageDownloader: ImageDownloader
};

const QrCodeModal: FCWithDeps<ShortUrlModalProps, QrCodeModalDeps> = (
  { shortUrl: { shortUrl, shortCode }, toggle, isOpen },
) => {
  const { ImageDownloader: imageDownloader } = useDependencies(QrCodeModal);
  const [size, setSize] = useState<number | undefined>();
  const [margin, setMargin] = useState<number | undefined>();
  const [errorCorrection, setErrorCorrection] = useState<QrErrorCorrection | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [bgColor, setBgColor] = useState<string | undefined>();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [radius, setRadius] = useState<number|undefined>();
  const [source, setSource] = useState<string|undefined>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const qrCodeColorsSupported = useFeature('qrCodeColors');

  useEffect(() => {
    const generateQR = async () => {
      // Append source to URL if provided
      const finalUrl = addSourceToUrl(shortUrl, source);

      const options = {
        width: size ?? 1024,
        margin: 0, // We'll handle margin ourselves
        color: {
          dark: color ?? '#000000',
          light: bgColor ?? '#FFFFFF',
        },
        errorCorrectionLevel: errorCorrection ?? 'L',
      };

      try {
        // For PNG format, we need to either use the canvas or generate a data URL directly
        if (canvasRef.current) {
          // Clear the canvas first
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Get the actual module count by creating a QR instance
          const qr = QRCode.create(finalUrl, {
            ...options,
            errorCorrectionLevel: options.errorCorrectionLevel,
          });
          const moduleCount = qr.modules.size;

          // Calculate sizes based on module count
          const marginWithDefault = margin ?? 1;
          const moduleSize = options.width / (moduleCount + (marginWithDefault * 2)); // Account for margin in module size
          const marginSize = marginWithDefault * moduleSize;
          const qrSize = moduleCount * moduleSize;
          const radiusWithDefault = radius ?? 1;
          const actualRadius = radiusWithDefault * moduleSize;

          // Set canvas dimensions to include margin
          canvasRef.current.width = qrSize + (marginSize * 2);
          canvasRef.current.height = canvasRef.current.width;

          // Clear the entire canvas
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

          // Draw rounded background
          ctx.fillStyle = options.color.light;
          ctx.beginPath();
          ctx.roundRect(0, 0, ctx.canvas.width, ctx.canvas.height, actualRadius + (marginSize / 2));
          ctx.fill();

          // Create a temporary canvas for the QR code
          const tempCanvas = document.createElement('canvas');
          await QRCode.toCanvas(tempCanvas, finalUrl, {
            ...options,
            width: qrSize, // Size without margin
          });

          // Draw the QR code with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(marginSize, marginSize, qrSize, qrSize, actualRadius); // Subtract margin size from radius
          ctx.clip();
          ctx.drawImage(
            tempCanvas,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height,
            marginSize,
            marginSize,
            qrSize,
            qrSize,
          );
          ctx.restore();

          setQrDataUrl(canvasRef.current.toDataURL('image/png'));
        } else {
          const dataUrl = await QRCode.toDataURL(finalUrl, options);
          setQrDataUrl(dataUrl);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (isOpen) {
      generateQR();
    }

    return () => {
      // Cleanup any object URLs when the component updates or unmounts
      if (qrDataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(qrDataUrl);
      }
    };
  }, [isOpen, shortUrl, size, margin, errorCorrection, color, bgColor, qrDataUrl, radius, source]);

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
      <ModalHeader toggle={toggle}>
        QR code for <ExternalLink href={addSourceToUrl(shortUrl, source)}>
          {addSourceToUrl(shortUrl, source)}
        </ExternalLink>
      </ModalHeader>
      <ModalBody className="d-flex flex-column-reverse flex-lg-row gap-3">
        <div className="flex-grow-1 d-flex align-items-center justify-content-around text-center">
          <canvas ref={canvasRef} className="shadow" style={{ maxWidth: '100%', display: qrDataUrl ? 'none' : 'block' }} />
          <img
            src={qrDataUrl}
            alt="QR code"
            className="shadow"
            style={{ maxWidth: '100%', display: qrDataUrl ? 'block' : 'none' }}
          />
        </div>
        <div className="d-flex flex-column gap-2 qr-code-modal__controls">
          <QrTextControl
            name="source"
            value={source}
            onChange={setSource}
            placeholder="qr"
            label="Tracking param"
          />
          <QrDimensionControl
            name="size"
            value={size}
            onChange={setSize}
            step={10}
            min={100}
            max={2048}
            initial={1024}
          />
          <QrDimensionControl
            name="margin"
            value={margin}
            onChange={setMargin}
            step={1}
            min={0}
            max={100}
            initial={1}
            unit=""
          />
          <QrDimensionControl
            name="border radius"
            value={radius}
            onChange={setRadius}
            step={0.5}
            min={0}
            max={3}
            initial={1}
            unit=""
          />
          <QrErrorCorrectionDropdown errorCorrection={errorCorrection} onChange={setErrorCorrection} />

          {qrCodeColorsSupported && (
            <>
              <QrColorControl name="color" initialColor="#000000" color={color} onChange={setColor} />
              <QrColorControl name="background" initialColor="#ffffff" color={bgColor} onChange={setBgColor} />
            </>
          )}

          <div className="mt-auto">
            <Button
              block
              color="primary"
              onClick={() => {
                imageDownloader.saveImage(qrDataUrl, `${shortCode}-qr-code.png`).catch(() => {});
              }}
            >
              Download <FontAwesomeIcon icon={downloadIcon} className="ms-1" />
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export const QrCodeModalFactory = componentFactory(QrCodeModal, ['ImageDownloader']);

function addSourceToUrl(shortUrl: string, source: string | undefined) {
  const url = new URL(shortUrl);
  if (source) {
    url.searchParams.set(TRACKING_PARAM, source);
  }

  return url.toString();
}
