/* global FileReader */
import React, {useCallback, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import styled from 'styled-components';
import {getMartialPointsFromOrders} from './OrderParser';
import {Report} from './Report';

const Container = styled.div`
    min-height: 100vh;
    display: flex;
    flex-flow: column nowrap;
`;

const Main = styled.div`
    line-height: 1.2em;
    font-size: 24px;
    align-self: center;
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    justify-content: center;
`;

const DropArea = styled.div`
    width: 800px;
    height: 400px;
    border: 1px dashed #000000;
    text-align: center;
    vertical-align: middle;
    align-items: center;
    justify-content: center;
    display: flex;
    position: relative;
    padding: 10px;

    cursor: pointer;
`;

export function MartialPoints(): JSX.Element {
    const [regions, setRegions] = useState(null);

    const onReset = useCallback(() => {
        setRegions(null);
    }, []);

    const onDrop = useCallback(acceptedFiles => {
        const reader = new FileReader();
        reader.readAsText(acceptedFiles[0]);
        reader.onload = (e): void => {
            const martialPointData = getMartialPointsFromOrders(String(e.target.result));
            setRegions(martialPointData);
        };
    }, []);

    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, multiple: false, disabled: !!regions});

    return (
        <Container >
            <Main>
                <DropArea {...getRootProps()}>
                    <input {...getInputProps()} />
                    {!regions && <> { isDragActive ? <p>Drop ALH orders here ...</p> : <p>Drag 'n' drop ALH orders here, or click to browse</p>}</>}
                    {regions && <Report martialPointData={regions} onReset={onReset}/>}
                </DropArea>
            </Main>
        </Container>
    );
}
