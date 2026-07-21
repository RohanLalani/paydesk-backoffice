import { Suspense } from 'react';
import { PromotionEditor } from '@/src/components/promotions/PromotionEditor';
export default function EditPromotionPage(){return <Suspense fallback={null}><PromotionEditor mode="edit"/></Suspense>}
