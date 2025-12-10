import { Shippo } from 'shippo'

let shippoClient: Shippo | null = null

function getShippo(): Shippo {
  if (!shippoClient) {
    if (!process.env.SHIPPO_API_KEY) {
      throw new Error('SHIPPO_API_KEY is not set')
    }
    shippoClient = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY,
    })
  }
  return shippoClient
}

export interface ShippoAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
  email?: string
}

export interface ShippoParcel {
  length: string
  width: string
  height: string
  distanceUnit: 'in' | 'cm'
  weight: string
  massUnit: 'lb' | 'oz' | 'kg' | 'g'
}

export interface ShippoRate {
  objectId: string
  provider: string
  servicelevel: {
    name: string
    token: string
  }
  amount: string
  currency: string
  estimatedDays: number
  durationTerms: string
}

export interface CreateShipmentResult {
  shipmentId: string
  rates: ShippoRate[]
}

export async function createShipment(
  addressFrom: ShippoAddress,
  addressTo: ShippoAddress,
  parcel: ShippoParcel
): Promise<CreateShipmentResult> {
  const shipment = await getShippo().shipments.create({
    addressFrom: {
      name: addressFrom.name,
      street1: addressFrom.street1,
      street2: addressFrom.street2,
      city: addressFrom.city,
      state: addressFrom.state,
      zip: addressFrom.zip,
      country: addressFrom.country,
      phone: addressFrom.phone,
      email: addressFrom.email,
    },
    addressTo: {
      name: addressTo.name,
      street1: addressTo.street1,
      street2: addressTo.street2,
      city: addressTo.city,
      state: addressTo.state,
      zip: addressTo.zip,
      country: addressTo.country,
      phone: addressTo.phone,
      email: addressTo.email,
    },
    parcels: [
      {
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
        distanceUnit: parcel.distanceUnit,
        weight: parcel.weight,
        massUnit: parcel.massUnit,
      },
    ],
    async: false,
  })

  const rates: ShippoRate[] = (shipment.rates ?? []).map((rate) => ({
    objectId: rate.objectId,
    provider: rate.provider ?? '',
    servicelevel: {
      name: rate.servicelevel?.name ?? '',
      token: rate.servicelevel?.token ?? '',
    },
    amount: rate.amount ?? '0',
    currency: rate.currency ?? 'USD',
    estimatedDays: rate.estimatedDays ?? 0,
    durationTerms: rate.durationTerms ?? '',
  }))

  return {
    shipmentId: shipment.objectId,
    rates,
  }
}

export interface PurchaseLabelResult {
  transactionId: string
  trackingNumber: string
  trackingUrlProvider: string
  labelUrl: string
  status: string
}

export type LabelFileType = 'PDF' | 'PDF_4x6' | 'PDF_A4' | 'PNG' | 'ZPLII'

export async function purchaseLabel(
  rateId: string,
  labelFileType: LabelFileType = 'PDF_4x6'
): Promise<PurchaseLabelResult> {
  const transaction = await getShippo().transactions.create({
    rate: rateId,
    labelFileType,
    async: false,
  })

  if (transaction.status === 'ERROR') {
    const messages = transaction.messages ?? []
    const errorMessage = messages.map((m) => m.text).join(', ')
    throw new Error(`Failed to create label: ${errorMessage}`)
  }

  return {
    transactionId: transaction.objectId ?? '',
    trackingNumber: transaction.trackingNumber ?? '',
    trackingUrlProvider: transaction.trackingUrlProvider ?? '',
    labelUrl: transaction.labelUrl ?? '',
    status: transaction.status ?? 'UNKNOWN',
  }
}

export async function getRates(shipmentId: string): Promise<ShippoRate[]> {
  const response = await getShippo().rates.listShipmentRates(shipmentId)

  return (response.results ?? []).map((rate) => ({
    objectId: rate.objectId,
    provider: rate.provider ?? '',
    servicelevel: {
      name: rate.servicelevel?.name ?? '',
      token: rate.servicelevel?.token ?? '',
    },
    amount: rate.amount ?? '0',
    currency: rate.currency ?? 'USD',
    estimatedDays: rate.estimatedDays ?? 0,
    durationTerms: rate.durationTerms ?? '',
  }))
}

export async function getTransaction(transactionId: string) {
  return getShippo().transactions.get(transactionId)
}
