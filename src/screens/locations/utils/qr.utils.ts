import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { printLocationQRs } from '../service/location.service';

/**
 * Common logic for printing and sharing location QRs
 * @param ids Array of location IDs to print
 * @param filename Custom filename for the PDF
 * @returns Promise with success status
 */
export const handleLocationQRPrint = async (
  ids: string[],
  filename: string = 'QRs_Locations'
): Promise<boolean> => {
  try {
    let base64data = await printLocationQRs(ids);

    if (!base64data) {
      return false;
    }

    // Clean base64 header if exists
    base64data = base64data.replace('data:application/pdf;base64,', '');

    const filePath = `${RNFS.CachesDirectoryPath}/${filename}.pdf`;

    await RNFS.writeFile(filePath, base64data, 'base64');

    await Share.open({
      url: `file://${filePath}`,
      type: 'application/pdf',
      filename: filename,
      failOnCancel: false,
    });
    
    return true;
  } catch (error) {
    console.error('QR Print Error:', error);
    return false;
  }
};
