import React from 'react';
import Button from '@mui/material/Button';

/**
 * MUI Button — primary building block for actions.
 * Wraps Material-UI Button with standard Milonexa variants.
 */
export default {
  title: 'Milonexa/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['contained', 'outlined', 'text'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'error', 'warning', 'success', 'info'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
};

export const Primary = {
  args: {
    variant: 'contained',
    color: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary = {
  args: {
    variant: 'contained',
    color: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outlined = {
  args: {
    variant: 'outlined',
    color: 'primary',
    children: 'Outlined Button',
  },
};

export const Small = {
  args: {
    variant: 'contained',
    size: 'small',
    children: 'Small Button',
  },
};

export const Disabled = {
  args: {
    variant: 'contained',
    disabled: true,
    children: 'Disabled',
  },
};
