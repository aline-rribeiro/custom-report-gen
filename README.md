# Report Hub

eu tenho um relatorio em python que emito, preciso que crie uma tela onde eu coloque os filtros que utilizo no relatorio em si, para que quando eu for emitir eu apenas troque essas informações
como esse relatorio consome direto do banco de dados da minha empresa, vai ser preciso criar uma tela para logar com as credenciais do banco de dados de cada um que for usar o relatorio
esse é o script que utilizamos para emitir ele em python:
from datetime import date, timedelta
import mysql.connector
import csv

cnx = None
cursor = None

try:
    cnx = mysql.connector.connect(user='aline.ribeiro',
        password='YnbF0#8@jA',
        host='db-read-analytics.prod.nexti.com',
        port=3306,
        database='nexti')

    sdate = date(2026, 7, 28)
    edate = date(2026, 8, 3)
    customerId = 103

    delta = edate - sdate

    with open('4_marcacoes_no_dia.xls',
        'w',
        newline='',
        encoding='utf-8'
    ) as csvfile:

        writer = csv.writer(csvfile,
            delimiter='\t',
            quotechar='"',
            quoting=csv.QUOTE_MINIMAL)

        writer.writerow([
            'ID_Colaborador',
            'Empresa',
            'Unidade_de_Negócios',
            'Cliente',
            'Posto',
            'Centro_de_Custo',
            'Matricula',
            'Colaborador',
            'CPF',
            'Cargo',
            'Escala',
            'Data_mais_de_4_marcação'
        ])

        for i in range(delta.days + 1):
            day = sdate + timedelta(days=i)

            print(f"Iniciando processamento para {day}")

            cursor = cnx.cursor()

            query = f"""
            SELECT
                p.id AS id_colaborador,
                com.company_name AS empresa,
                bu.name AS unidade_de_negócios,
                cli.name AS cliente,
                w.name AS posto,
                w.cost_center AS centro_de_custo,
                p.enrolment AS matrícula,
                p.name AS colaborador,
                p.cpf AS cpf,
                car.name AS cargo,
                sch.name AS escala,
                c3.dateClockingCountMarking AS data_mais_de_4_marcação
            FROM person p

            INNER JOIN workplace_transfer wt
                ON wt.person_id = p.id
                AND (wt.removed IS NULL OR wt.removed = 0)
                AND wt.transfer_date = (
                    SELECT MAX(wtr2.transfer_date)
                    FROM workplace_transfer wtr2
                    WHERE wtr2.person_id = p.id
                        AND wtr2.transfer_date <= '{day}'
                        AND (wtr2.removed IS NULL OR wtr2.removed = 0)
                )

            INNER JOIN schedule_transfer st
                ON st.person_id = p.id
                AND (st.removed IS NULL OR st.removed = 0)
                AND st.transfer_date = (
                    SELECT MAX(str2.transfer_date)
                    FROM schedule_transfer str2
                    WHERE str2.person_id = p.id
                        AND str2.transfer_date <= '{day}'
                        AND (str2.removed IS NULL OR str2.removed = 0)
                )

            INNER JOIN schedule sch
                ON sch.id = st.schedule_id

            INNER JOIN workplace w
                ON w.id = wt.workplace_id

            INNER JOIN client cli
                ON cli.id = w.client_id

            INNER JOIN company com
                ON com.id = p.company_id

            INNER JOIN career car
                ON car.id = p.career_id

            LEFT JOIN business_unit bu
                ON w.business_unit_id = bu.id

            INNER JOIN (
                SELECT
                    c.person_id,
                    GROUP_CONCAT(DISTINCT DATE(c.reference_date)) AS dateClockingCountMarking
                FROM clocking c
                WHERE c.customer_id = {customerId}
                    AND c.clocking_type_id IN (1,3,9,8)
                    AND (c.removed IS NULL OR c.removed = 0)
                    AND c.reference_date BETWEEN '{day} 00:00:00' AND '{day} 23:59:59'
                GROUP BY c.person_id
                HAVING COUNT(c.clocking_type_id IN (1,3,9,8)) >= 6
            ) c3
                ON p.id = c3.person_id

            WHERE p.customer_id = {customerId}
                AND p.person_situation_id <> 3
                AND (
                    p.demission_date IS NULL
                    OR (
                        p.demission_date IS NOT NULL
                        AND p.demission_date > '{day}'
                    )
                )
                AND (p.removed IS NULL OR p.removed = 0)
                AND NOT EXISTS (
                    SELECT 1
                    FROM absence abs
                    INNER JOIN absence_situation abst
                        ON abst.id = abs.absence_situation_id
                    WHERE abs.customer_id = p.customer_id
                        AND abs.person_id = p.id
                        AND abst.absence_type_id = 3
                        AND abs.start_date <= '{day}'
                        AND (abs.removed IS NULL OR abs.removed = 0)
                )
            ORDER BY
                empresa,
                colaborador
            """

            cursor.execute(query)

            rows = cursor.fetchall()

            for row in rows:
                writer.writerow(row)

            print(f"Dados para {day} salvos com sucesso.")

            cursor.close()
            cursor = None

except Exception as e:
    print("An error occurred:", str(e))

finally:
    if cursor is not None:
        cursor.close()

    if cnx is not None:
        cnx.close()

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d31866a1-2cfc-4e1d-b374-e8fdf5a3b03b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
