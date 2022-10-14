import React from 'react';
import styled from 'styled-components';

export interface PercentileGraphProps {
    items: number[];
}

const PercentileContainer = styled.div`
    display: flex;
    height: 12px;
    gap: 1px;
    justify-content: flex-end;
    align-items: flex-end;
`;

const PercentileBar = styled.div`
    width: 4px;
    background-color: silver;
`;

export default function PercentileGraph({ items }: PercentileGraphProps) {
    const { min, range } = React.useMemo(() => {
        const min = Math.min(...items)
        const max = Math.max(...items)
        const range = max - min

        return { min, max, range }
    }, [ items ])

    return <PercentileContainer>
        { items.map((x, i) => {
            const h = (x - min) / range * 10 + 2;
            return <PercentileBar key={i} title={`${(i + 1) * 10}%`} style={{ height: `${h}px` }} />
        })}
    </PercentileContainer>
}