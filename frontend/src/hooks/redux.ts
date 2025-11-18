// Custom Hooks - NGS&O CRM Gestión
// Desarrollado por: Alejandro Sandoval - AS Software

import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store/index';

// Hooks tipados para Redux
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
