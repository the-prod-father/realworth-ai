import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts for professional look
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#14b8a6',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
  },
  logoTextLight: {
    fontSize: 20,
    fontWeight: 400,
    color: '#64748b',
  },
  certificateTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Main content
  mainContent: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  imageSection: {
    width: '40%',
  },
  itemImage: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  detailsSection: {
    width: '60%',
  },
  // Item details
  itemName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 4,
  },
  itemAuthor: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  badge: {
    backgroundColor: '#f0fdfa',
    color: '#0d9488',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: 600,
  },
  badgeSecondary: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: 600,
  },
  // Valuation box
  valuationBox: {
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  valuationLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valuationAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 2,
  },
  valuationRange: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  // Confidence box
  confidenceBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 15,
  },
  confidenceLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confidenceScore: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
  },
  confidenceMax: {
    fontSize: 12,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
  },
  confidenceBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    color: '#5eead4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 600,
  },
  // Sections
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
  // Reasoning box
  reasoningBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  reasoningTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 6,
  },
  reasoningContent: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5,
  },
  // Confidence factors
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '48%',
    marginBottom: 4,
  },
  factorIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    fontWeight: 700,
  },
  factorPositive: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  factorNegative: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  factorNeutral: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  factorText: {
    flex: 1,
  },
  factorName: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1e293b',
  },
  factorDetail: {
    fontSize: 8,
    color: '#64748b',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 600,
  },
  disclaimer: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 1.4,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  qrLabel: {
    fontSize: 7,
    color: '#94a3b8',
    marginBottom: 4,
  },
  verifyUrl: {
    fontSize: 8,
    color: '#14b8a6',
    fontWeight: 600,
  },
});

interface CertificateProps {
  itemName: string;
  author?: string;
  era?: string;
  category: string;
  description: string;
  priceLow: number;
  priceHigh: number;
  currency: string;
  reasoning: string;
  imageUrl?: string;
  confidenceScore?: number;
  confidenceFactors?: Array<{
    factor: string;
    impact: 'positive' | 'neutral' | 'negative';
    detail: string;
  }>;
  appraisalId: string;
  appraisalDate: string;
  ownerName?: string;
}

export function InsuranceCertificate({
  itemName,
  author,
  era,
  category,
  description,
  priceLow,
  priceHigh,
  currency,
  reasoning,
  imageUrl,
  confidenceScore = 75,
  confidenceFactors = [],
  appraisalId,
  appraisalDate,
  ownerName,
}: CertificateProps) {
  const avgValue = (priceLow + priceHigh) / 2;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return 'Very High';
    if (score >= 70) return 'High';
    if (score >= 50) return 'Moderate';
    return 'Low';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>RealWorth</Text>
            <Text style={styles.logoTextLight}>.ai</Text>
          </View>
          <Text style={styles.certificateTitle}>Appraisal Certificate</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            {imageUrl && (
              <Image src={imageUrl} style={styles.itemImage} />
            )}
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.itemName}>{itemName}</Text>
            {author && author !== 'N/A' && (
              <Text style={styles.itemAuthor}>by {author}</Text>
            )}

            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{category}</Text>
              {era && <Text style={styles.badgeSecondary}>{era}</Text>}
            </View>

            {/* Valuation Box */}
            <View style={styles.valuationBox}>
              <Text style={styles.valuationLabel}>Estimated Market Value</Text>
              <Text style={styles.valuationAmount}>{formatCurrency(avgValue)}</Text>
              <Text style={styles.valuationRange}>
                Range: {formatCurrency(priceLow)} - {formatCurrency(priceHigh)}
              </Text>
            </View>

            {/* Confidence Box */}
            <View style={styles.confidenceBox}>
              <Text style={styles.confidenceLabel}>Appraisal Confidence</Text>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceScore}>
                  {confidenceScore}
                  <Text style={styles.confidenceMax}>/100</Text>
                </Text>
                <Text style={styles.confidenceBadge}>
                  {getConfidenceLevel(confidenceScore)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Description</Text>
          <Text style={styles.sectionContent}>{description}</Text>
        </View>

        {/* Valuation Reasoning */}
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningTitle}>Valuation Reasoning</Text>
          <Text style={styles.reasoningContent}>{reasoning}</Text>
        </View>

        {/* Confidence Factors */}
        {confidenceFactors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Confidence Factors</Text>
            <View style={styles.factorsGrid}>
              {confidenceFactors.slice(0, 6).map((cf, idx) => (
                <View key={idx} style={styles.factor}>
                  <View style={[
                    styles.factorIcon,
                    cf.impact === 'positive' ? styles.factorPositive :
                    cf.impact === 'negative' ? styles.factorNegative :
                    styles.factorNeutral
                  ]}>
                    <Text>
                      {cf.impact === 'positive' ? '+' : cf.impact === 'negative' ? '-' : '~'}
                    </Text>
                  </View>
                  <View style={styles.factorText}>
                    <Text style={styles.factorName}>{cf.factor}</Text>
                    <Text style={styles.factorDetail}>{cf.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>Certificate ID</Text>
              <Text style={styles.footerValue}>{appraisalId.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>Date of Appraisal</Text>
              <Text style={styles.footerValue}>{formatDate(appraisalDate)}</Text>
            </View>
            {ownerName && (
              <View>
                <Text style={styles.footerLabel}>Appraised For</Text>
                <Text style={styles.footerValue}>{ownerName}</Text>
              </View>
            )}
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Verify this certificate at:</Text>
            <Text style={styles.verifyUrl}>realworth.ai/treasure/{appraisalId}</Text>
          </View>

          <Text style={styles.disclaimer}>
            This appraisal certificate was generated by RealWorth.ai using artificial intelligence analysis.
            Values are estimates based on market data and may vary. This certificate is suitable for insurance
            documentation and personal records. For high-value items, we recommend seeking additional
            professional appraisals. RealWorth.ai is not liable for valuation discrepancies.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default InsuranceCertificate;
