import { Daytona } from "@daytona/sdk"

let daytonaClient: Daytona | undefined

export function getDaytonaClient() {
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY is required to use Daytona.")
  }

  daytonaClient ??= new Daytona({
    apiUrl:
      process.env.DAYTONA_API_URL ||
      process.env.DAYTONA_SERVER_URL,
  })

  return daytonaClient
}
