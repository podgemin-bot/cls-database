// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Table, TableBody, TableCell, TableRow } from "./table"

describe("Table", () => {
  it("renders a mobile horizontal-scroll hint", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>ข้อมูล</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const hint = screen.getByText("ปัดซ้าย-ขวาเพื่อดูข้อมูลเพิ่มเติม")
    expect(hint).toHaveClass("md:hidden")
    expect(screen.getByRole("table")).toBeInTheDocument()
  })
})
