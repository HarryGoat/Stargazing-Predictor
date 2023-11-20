import { z } from "zod";
import { router, publicProcedure } from "~/server/api/trpc";

require('dotenv').config();
const rapidApiKey = process.env.RAPIDAPI_KEY;

function calculateStargazingRating(cloudCover: number, humidity: number, moonPhaseIllumination: number) {
  const coefficientCloudCover = 0.2;
  const coefficientHumidity = 1.5;
  const coefficientMoonPhase = 4;
  const impactMultiplier = 2; 

  const skyQuality = coefficientCloudCover * (1 - cloudCover) * (humidity + coefficientMoonPhase * moonPhaseIllumination * impactMultiplier);
  const stargazingQuality = 1 - (cloudCover + coefficientHumidity * humidity + skyQuality);  
  const stargazingPercentage = Math.floor((100 * stargazingQuality) / 1);

  return stargazingPercentage;
}

function determineMoonPhase(moonPhase: string){
  let moonPhaseIllumination = 0;
      if (moonPhase === "waningCresent" || moonPhase === "waxingCresent") {
        moonPhaseIllumination = 0.25;
      } else if (moonPhase === "firstQuarter" || moonPhase === "thirdQuarter") {
        moonPhaseIllumination = 0.5;
      } else if (moonPhase === "new") {
        moonPhaseIllumination = 0;
      } else if (moonPhase === "full") {
        moonPhaseIllumination = 1;
      } else if (
        moonPhase === "waningGibbous" ||
        moonPhase === "waxingGibbous"
      ) {
        moonPhaseIllumination = 0.75;
      }

      return moonPhaseIllumination;
}


export const exampleRouter = router({
  apiHandler: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const url = `https://kayuloweather.p.rapidapi.com/weather/en/${input.longitude}/${input.latitude}?timezone=Europe%2FLondon&dataSets=forecastDaily%2CforecastHourly%2CforecastNextHour`;
      // Checking if rapidApiKey is defined before using it in the headers
      const headers: Record<string, string> = {
        "X-RapidAPI-Host": "kayuloweather.p.rapidapi.com",
      };

      if (rapidApiKey) {
        headers["X-RapidAPI-Key"] = rapidApiKey;
      }

      const options = {
        method: "GET",
        headers,
      };

      const response = await fetch(url, options);
      const result = await response.text();
      const jsonResult = JSON.parse(result) as {
        forecastDaily: {
          days: {
            moonPhase: string;
            overnightForecast: { humidity: number; cloudCover: number };
          }[];
        };
      };
      const todaysForecast = jsonResult.forecastDaily.days[0]!;
      const cloudCover = todaysForecast.overnightForecast.cloudCover;
      const humidity = todaysForecast.overnightForecast.humidity;
      const moonPhase = todaysForecast.moonPhase;

      const stargazingPercentage = calculateStargazingRating(cloudCover, humidity, determineMoonPhase(moonPhase));

      const ratingDisplay = "Rating: " + stargazingPercentage + "/100";
      return ratingDisplay;
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.example.findMany();
  }),
});


