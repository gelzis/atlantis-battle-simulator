import React from 'react';
import {theme} from '../../StyledComponents';
import styled from 'styled-components';
import {realNumber} from '../utils';

export interface PercentileGraphProps {
    items: number[]
}

const PercentileContainer = styled.div`
    display: flex;
    height: 18px;
    gap: 1px;
    justify-content: flex-end;
    align-items: flex-end;
`;

const PercentileItem = styled.div`
    width: 4px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    .bar {
        width: 100%;
        background-color: ${theme.palette.primary.light};
    }
    
    &:hover .bar {
        background-color: ${theme.palette.primary.dark};
        transform: scale(1.1);
        transform-origin: center bottom;
    }
`;

export default function PercentileGraph({items}: PercentileGraphProps) {
    const {min, range} = React.useMemo(() => {
        const min = Math.min(...items);
        const max = Math.max(...items);
        const range = max - min;

        return {min, max, range};
    }, [items]);

    return <PercentileContainer>
        { items.map((x, i) => {
            const h = (x - min) / range * 16 + 2;
            const title = `${(i + 1) * 10}% : ${realNumber(x)}`;
            return <PercentileItem key={i} title={title}>
                <div className='bar' style={{height: `${h}px`}} />
            </PercentileItem>;
        })}
    </PercentileContainer>;
}
