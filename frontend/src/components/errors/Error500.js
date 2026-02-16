import React from 'react';
import ErrorPage from './ErrorPage';

export default function Error500({ details }) {
    return <ErrorPage code={500} details={details} />;
}
