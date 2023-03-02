/// <reference lib="webworker" />

addEventListener('message', ({data}) => {
    console.log('hello!', data.table);
    const iterations = data.iterations;
    const id = data.id;
    const table = data.table;
    let frontier = data.frontier;

    const singularities: any[] = [];
    for (let i = 0; i < iterations; i++) {
        const newFrontier = table.generatePreimages(frontier);
        singularities.push(...newFrontier)
        frontier = newFrontier;
    }

    singularities.push(...frontier);

    const response = {
        id,
        singularities,
        stillWorking: false,
    }

    postMessage(response);
});