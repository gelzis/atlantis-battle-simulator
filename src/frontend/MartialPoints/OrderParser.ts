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

        // matches ALH version
        // ;*** desert (3,1)
        // also
        // ;*** desert (3,1,underworld)
        let matches = line.match(/;\*\*\* \w+ \((\d+),(\d+),?(\w+)?\)/);
        if (matches) {
            currentRegion = `${matches[1]},${matches[2]}`;
            if (matches[3]) {
                currentRegion += `,${matches[3]}`;
            }
        }

        // matches advisor version
        // ; desert (3,1) in Great Boldur Desert
        // ; desert (3,1,underworld) in Great Boldur Desert
        matches = line.match(/; \w+ \((\d+),(\d+),?(\w+)?\)/);
        if (matches) {
            currentRegion = `${matches[1]},${matches[2]}`;
            if (matches[3]) {
                currentRegion += `,${matches[3]}`;
            }
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
