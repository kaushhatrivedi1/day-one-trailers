import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { PollyClient } from '@aws-sdk/client-polly'
import { TranslateClient } from '@aws-sdk/client-translate'
import { RekognitionClient } from '@aws-sdk/client-rekognition'
import { SFNClient } from '@aws-sdk/client-sfn'

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
export const s3 = new S3Client({})
// Nova Canvas lives in specific regions (us-east-1 at time of writing). Check Bedrock model access.
export const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' })
export const polly = new PollyClient({})
export const translate = new TranslateClient({})
export const rekognition = new RekognitionClient({})
export const sfn = new SFNClient({})

export const TABLE = process.env.TABLE_NAME
export const BUCKET = process.env.MEDIA_BUCKET

export const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
})
