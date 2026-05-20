import { describe, expect, it } from 'vitest';

import { BUSINESS_INFO, PAID_PRODUCTS } from '../src/lib/businessInfo';

describe('payment review readiness content', () => {
  it('declares all paid products shown in policy pages', () => {
    expect(PAID_PRODUCTS.map(product => product.name)).toEqual([
      '프로 10일 이용권',
      '프로 20일 이용권',
      '울트라 30일 이용권',
      '전문가 코칭 플레이북',
    ]);
    expect(PAID_PRODUCTS.map(product => product.price)).toEqual(['8,900원', '13,500원', '29,900원', '3,900원']);
  });

  it('centralizes public business and policy contact fields', () => {
    expect(BUSINESS_INFO.companyName).toBe('휴머니스틱');
    expect(BUSINESS_INFO.serviceName).toBe('Letmefree');
    expect(BUSINESS_INFO.representative).toBeTruthy();
    expect(BUSINESS_INFO.mailOrderSalesNumber).toBe('제 2026-서울양천-0626 호');
    expect(BUSINESS_INFO.mailOrderSalesNumber).not.toContain('진행 중');
    expect(BUSINESS_INFO.businessAddress).toContain('서울특별시 양천구 목동동로12길 60');
    expect(BUSINESS_INFO.customerSupportEmail).toContain('@');
    expect(BUSINESS_INFO.privacyEmail).toContain('@');
    expect(BUSINESS_INFO.refundRequestEmail).toBe(BUSINESS_INFO.customerSupportEmail);
  });
});
