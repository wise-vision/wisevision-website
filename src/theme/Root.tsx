import React from 'react';
import Root from '@theme-original/Root';
import GifModal from '../components/GifModal';

export default function RootWrapper(props: any) {
  return (
    <>
      <Root {...props} />
      <GifModal />
    </>
  );
}
