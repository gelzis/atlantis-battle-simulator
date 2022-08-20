/* global Blob */

export function download(text: string, filename: string): void {
    const blob = new Blob(
        [text],
        {
            type: 'application/json',
        },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}
