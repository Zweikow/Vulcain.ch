import { creditorReference, qrReference } from '@/lib/reference'

/**
 * Génère un fichier XML CAMT.054 exemple pour tester ou faire une démonstration
 * du rapprochement bancaire automatique.
 */
export function generateSampleCamtXml(): string {
  const refFac2 = creditorReference('FAC-2026-0002')
  const refFac3 = qrReference('FAC-2026-0003')
  const refFac1 = creditorReference('FAC-2026-0001')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.04"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>PF-NOTIF-20260925-8819</MsgId>
      <CreDtTm>2026-09-25T07:15:00Z</CreDtTm>
    </GrpHdr>
    <Ntfctn>
      <Id>NTF-20260925-001</Id>
      <CreDtTm>2026-09-25T07:15:00Z</CreDtTm>
      <Acct>
        <Id>
          <IBAN>CH5709000000170331896</IBAN>
        </Id>
        <Ccy>CHF</Ccy>
      </Acct>

      <!-- 1. Virement QR-facture avec référence SCOR pour FAC-2026-0002 (139.80 CHF) -->
      <Ntry>
        <Amt Ccy="CHF">139.80</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt>
          <Dt>2026-09-25</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-09-25</Dt>
        </ValDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-CH-20260925-01</EndToEndId>
            </Refs>
            <Amt Ccy="CHF">139.80</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            <RltdPties>
              <Dbtr>
                <Nm>Baeriswyl Hugo</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Tp>
                    <CdOrPrtry>
                      <Cd>SCOR</Cd>
                    </CdOrPrtry>
                  </Tp>
                  <Ref>${refFac2}</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>

      <!-- 2. Virement QR-facture avec référence QRR 27 chiffres pour FAC-2026-0003 (316.80 CHF) -->
      <Ntry>
        <Amt Ccy="CHF">316.80</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt>
          <Dt>2026-09-25</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-09-25</Dt>
        </ValDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-CH-20260925-02</EndToEndId>
            </Refs>
            <Amt Ccy="CHF">316.80</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            <RltdPties>
              <Dbtr>
                <Nm>Edamus Chalet des Enfants</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Tp>
                    <CdOrPrtry>
                      <Prtry>QRR</Prtry>
                    </CdOrPrtry>
                  </Tp>
                  <Ref>${refFac3}</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>

      <!-- 3. Virement d'une facture déjà réglée pour FAC-2026-0001 (152.40 CHF) -->
      <Ntry>
        <Amt Ccy="CHF">152.40</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt>
          <Dt>2026-09-25</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-09-25</Dt>
        </ValDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-CH-20260925-03</EndToEndId>
            </Refs>
            <Amt Ccy="CHF">152.40</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            <RltdPties>
              <Dbtr>
                <Nm>Baeriswyl Hugo</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Ref>${refFac1}</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>

      <!-- 4. Virement avec communication libre pour CMD-2026-0004 (259.20 CHF) -->
      <Ntry>
        <Amt Ccy="CHF">259.20</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt>
          <Dt>2026-09-25</Dt>
        </BookgDt>
        <ValDt>
          <Dt>2026-09-25</Dt>
        </ValDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>E2E-CH-20260925-04</EndToEndId>
            </Refs>
            <Amt Ccy="CHF">259.20</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            <RltdPties>
              <Dbtr>
                <Nm>Baeriswyl Bertrand</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Paiement commande CMD-2026-0004 merci</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>

    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`
}
