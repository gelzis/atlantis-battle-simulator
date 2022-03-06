type MartialHex = {
    coords: string
    produce: boolean
    tax: boolean
}

export type MartialPointData = {
    count: number
    regions: MartialHex[]
}

export function getMartialPointsFromOrders(orders: string): MartialPointData {
    const lines = orders.split(/\r?\n/).filter(el => el).map(el => el.toLowerCase().trim());

    let currentRegion = '';
    const regions = {} as Record<string, MartialHex>;
    for (const index in lines) {
        const line = lines[index];

        // matches ;*** desert (3,1)
        const matches = line.match(/;\*\*\* \w+ \((\d+),(\d+)\)/);
        if (matches) {
            currentRegion = `${matches[1]},${matches[2]}`;
        }

        const hasProduce = !!line.trim().match(/^[@]?produce/);
        const hasTax = !!line.trim().match(/^[@]?(pillage|tax)/);

        if ((hasProduce || hasTax) && !regions[currentRegion]) {
            regions[currentRegion] = {
                coords: currentRegion,
                produce: false,
                tax: false,
            };
        }

        if (hasTax) {
            regions[currentRegion].tax = true;
        }

        if (hasProduce) {
            regions[currentRegion].produce = true;
        }
    }

    return {
        count: Object.keys(regions).length,
        regions: Object.values(regions),
    };
}
