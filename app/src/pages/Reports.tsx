import { FilePdf } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrint } from '../components/print'
import { TableReportPage, type TableModel } from '../components/report/TableReportPage'
import { Button, Empty, Field, Input, PageHeader, Segmented } from '../components/ui'
import { addMonths, monthKey, monthsBetween } from '../lib/dates'
import { useActiveLot, useWorkspace } from '../lib/store'
import { cumulativeModels, monthlyCvModels } from '../lib/tables'
import { useUi } from '../lib/ui'

type Kind = 'cv' | 'cmean' | 'csd' | 'ccv'

export function ReportsPage() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const month = useUi((s) => s.month)
  const print = usePrint()
  const [kind, setKind] = useState<Kind>('cv')
  const start = lot ? monthKey(lot.startDate) : month
  const [from, setFrom] = useState<string>(() => (addMonths(month, -11) > start ? addMonths(month, -11) : start))
  const [to, setTo] = useState<string>(month)
  useEffect(() => {
    setTo(month)
    setFrom(addMonths(month, -11) > start ? addMonths(month, -11) : start)
  }, [month, start])

  const models = useMemo<Record<Kind, TableModel[]>>(() => {
    if (!lot || from > to) return { cv: [], cmean: [], csd: [], ccv: [] }
    const months = monthsBetween(from, to)
    return {
      cv: monthlyCvModels(ws, lot, months),
      cmean: cumulativeModels(ws, lot, months, 'mean'),
      csd: cumulativeModels(ws, lot, months, 'sd'),
      ccv: cumulativeModels(ws, lot, months, 'cv'),
    }
  }, [ws, lot, from, to])

  if (!lot) return <Empty title="No control lot yet" action={<Link to="/setup"><Button variant="primary">Set up a control lot</Button></Link>} />

  const doPrint = (which: Kind[]) =>
    print(
      which.flatMap((k) => models[k].map((m, i) => ({ key: `${k}${i}`, landscape: true, node: <TableReportPage model={m} lab={ws.lab} /> }))),
      which.length > 1 ? 'Cumulative Mean SD CV Report' : models[which[0]][0]?.title,
    )

  return (
    <>
      <PageHeader
        title="CV & cumulative reports"
        sub="Monthly CV per test and level, and the running cumulative mean, SD and CV since the lot start. Landscape A4, ready to sign."
        actions={
          <>
            <Button onClick={() => doPrint(['cmean', 'csd', 'ccv'])}>Print cumulative set</Button>
            <Button variant="dark" onClick={() => doPrint([kind])}><FilePdf size={16} /> Print this report</Button>
          </>
        }
      />
      <div data-reveal className="mb-6 flex flex-wrap items-end gap-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'cv', label: 'Monthly CV' },
            { value: 'cmean', label: 'Cumulative mean' },
            { value: 'csd', label: 'Cumulative SD' },
            { value: 'ccv', label: 'Cumulative CV' },
          ]}
        />
        <div className="ml-auto flex gap-3">
          <Field label="From month"><Input type="month" value={from} min={start} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To month"><Input type="month" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        {models[kind].map((m, i) => (
          <div key={kind + i + from + to} data-reveal className="paper overflow-hidden rounded-md bg-white">
            <TableReportPage model={m} lab={ws.lab} animate />
          </div>
        ))}
      </div>
    </>
  )
}
