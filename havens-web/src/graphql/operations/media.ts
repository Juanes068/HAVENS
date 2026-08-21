import { gql } from '@apollo/client';

/**
 * Mutation to generate Cloudinary upload signature from backend.
 */
export const GENERATE_CLOUDINARY_SIGNATURE = gql`
  mutation GenerateCloudinarySignature($paramsToSign: JSONString!, $folder: String) {
    generateCloudinarySignature(paramsToSign: $paramsToSign, folder: $folder) {
      signature
      timestamp
      apiKey
      success
      message
    }
  }
`;
