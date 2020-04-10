import * as path from "path";
import * as vscode from "vscode";
import { INode } from "../INode";
import { ModelType, Constants } from "../../common/Constants";
import { QueryUnit } from "../../database/QueryUnit";
import { DatabaseCache } from "../../database/DatabaseCache";
import { IConnection } from "../Connection";
import { ConnectionManager } from "../../database/ConnectionManager";
import { MySQLTreeDataProvider } from "../../provider/MysqlTreeDataProvider";

class ColumnTreeItem extends vscode.TreeItem {
    columnName: string;
    detail: string;
    document: string;
}

export class ColumnNode implements INode, IConnection {
    identify: string;
    type: string = ModelType.COLUMN;
    constructor(readonly host: string, readonly user: string, readonly password: string,
        readonly port: string, readonly database: string, private readonly table: string,
        readonly certPath: string, public readonly column: any) {
    }

    private getIndex(columnKey:string){
        switch(columnKey){
            case 'UNI':return "UniqueKey"
            case 'MUL':return "IndexKey"
            case 'PRI':return "PrimaryKey"
        }
        return '';
    }

    public getTreeItem(): ColumnTreeItem {
        return {
            columnName: `${this.column.name}`,
            detail: `${this.column.type}`,
            document: `${this.column.comment}`,
            label: `${this.column.name} : ${this.column.type}  ${this.getIndex(this.column.key)}   ${this.column.comment}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: ModelType.COLUMN,
            iconPath: path.join(Constants.RES_PATH,  this.column.key === "PRI" ? "b_primary.png" : "b_props.png"),
            command: {
                command: "mysql.column.update",
                title: "Update Column Statement",
                arguments: [this, true]
            }
        };
    }

    public async getChildren(): Promise<INode[]> {
        return [];
    }

    public async changeColumnName() {
        
        const columnName = this.column.name
        vscode.window.showInputBox({ value: columnName, placeHolder: 'newColumnName', prompt: `You will changed ${this.table}.${columnName} to new column name!` }).then(async newColumnName => {
            if (!newColumnName) return
            const sql = `alter table \`${this.database}\`.\`${this.table}\` change column \`${columnName}\` \`${newColumnName}\` ${this.column.type} comment '${this.column.comment}'`
            QueryUnit.queryPromise(await ConnectionManager.getConnection(this), sql).then((rows) => {
                DatabaseCache.clearColumnCache(`${this.host}_${this.port}_${this.user}_${this.database}_${this.table}`)
                MySQLTreeDataProvider.refresh()
            })

        })
    }

    updateColumnTemplate() {
        ConnectionManager.getConnection(this, true)
        QueryUnit.showSQLTextDocument(`ALTER TABLE \n\t\`${this.database}\`.\`${this.table}\` CHANGE \`${this.column.name}\` \`${this.column.name}\` ${this.column.type} NOT NULL comment '${this.column.comment}';`);
    }
    dropColumnTemplate() {
        ConnectionManager.getConnection(this, true)
        QueryUnit.createSQLTextDocument(`ALTER TABLE \n\t\`${this.database}\`.\`${this.table}\` DROP COLUMN \`${this.column.name}\`;`);
    }
    

}
