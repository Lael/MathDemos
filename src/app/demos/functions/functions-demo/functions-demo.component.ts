import {Component} from '@angular/core';
import {Expression} from "../../../../math/algebra/expression";

@Component({
    selector: 'app-functions-demo',
    templateUrl: './functions-demo.component.html',
    styleUrls: ['./functions-demo.component.sass']
})
export class FunctionsDemoComponent {

    constructor() {
    }

    updateFunction(event: Event) {
        const content = (event.target as HTMLInputElement).value;
        console.log(`Input: ${content}`);
        const expression = Expression.parse(content);
        console.log(expression.toString());
        const variables = new Map<string, number>();
        console.log(expression.evaluate(variables));
    }
}
