import { QRStyleEngineInput } from './types';

export function buildQrCodeOptions(style: QRStyleEngineInput, data: string): Record<string, any>
{
  const options: any = {
    width: 1000,
    height: 1000,
    margin: style.quietZone * 10, // Margin in modules, multiplied by scale roughly. QR Code Styling uses absolute pixels for margin, so this is just relative.
    data: data,
    dotsOptions: {
      type: style.dotsType,
      color: style.dotsColor,
    },
    backgroundOptions: {
      color: style.backgroundColor,
    },
    cornersSquareOptions: {
      type: style.cornerSquareType,
      color: style.cornerSquareColor,
    },
    cornersDotOptions: {
      type: style.cornerSquareType === 'extra-rounded' ? 'dot' : 'square',
      color: style.cornerSquareColor,
    },
  };

  if (style.gradient?.enabled && style.gradient.colorStops?.length > 0)
  {
    options.dotsOptions.gradient = {
      type: style.gradient.type,
      colorStops: style.gradient.colorStops.map((stop: any) => ({
        offset: stop.offset,
        color: stop.color
      }))
    };
  }

  if (style.logo?.enabled && style.logo.imageDataUrl)
  {
    options.image = style.logo.imageDataUrl;
    options.imageOptions = {
      crossOrigin: 'anonymous',
      margin: style.logo.margin,
      imageSize: style.logo.sizeRatio,
      hideBackgroundDots: true,
    };
  }

  return options;
}
