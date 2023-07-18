import { z } from "zod"


const US = [ 'us-east-2' , 'us-east-1' , 'us-west-1' , 'us-west-2' ] as const
const AF = [ 'af-south-1' ] as const
const AP = [ 'ap-east-1' , 'ap-south-2' , 'ap-southeast-3' , 'ap-southeast-4' , 'ap-south-1' , 'ap-northeast-3' , 'ap-northeast-2' , 'ap-southeast-1' , 'ap-southeast-2' , 'ap-northeast-1' ] as const
const CA = [ 'ca-central-1' ] as const
const EU = [ 'eu-central-1' , 'eu-west-1' , 'eu-west-2' , 'eu-south-1' , 'eu-west-3' , 'eu-south-2' , 'eu-north-1' , 'eu-central-2' ] as const
const ME = [ 'me-south-1' , 'me-central-1' ] as const
const SA = [ 'sa-east-1' ] as const

const regions = [ ...US, ...AF , ...AP , ...CA , ...EU , ...ME , ...SA ] as const

export type Region = typeof regions[number]
export const RegionSchema = z.enum(regions)
