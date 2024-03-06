import {Base} from "../objects/Base";

/**
 * main page initialisation containing functionality
 * that is shared across all test cases
 */
export class Fixtures {

  public static checkTemperature():void{
    let temperatureText: string;

    cy.get(Base.landingPage.temperature).invoke('text').then((text) => {
      temperatureText = text;
      let temperature = parseFloat(temperatureText.split(' ')[0]);
      cy.log(text)

      try {
        /* If temperature is less than 19, navigate to "Moisturizer" page */

        if (temperature < 19) {
          cy.get(Base.landingPage.moisturizerButton).click()
        }

        /* If temperature is greater than 34, navigate to "Sunscreen" page */
        else if (temperature > 34) {
          cy.get(Base.landingPage.sunscreenButton).click()
        }
      } catch (error) {
        console.error(error);
      }
    })
  }

  public static open(path){
    return cy.visit(path);
  }
}
