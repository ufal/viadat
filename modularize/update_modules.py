#!/usr/bin/env python

import os
import os.path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import yaml


class CommandException(Exception):
    pass


def run_command(cmd, success_msg, error_msg):
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(success_msg)
        return result
    except subprocess.CalledProcessError as error:
        print(error_msg + '\n')
        print(error.stdout)
        print(error.stderr)
        raise CommandException()


def load_config():
    config_file = os.path.join(os.path.dirname(__file__), 'config.yml')
    with open(config_file, 'r') as fh:
        return yaml.safe_load(fh)


def update_module(source_dir, name, path, repository, commit_msg):
    print(f'\nUpdating module {name}:')
    cwd = os.getcwd()

    with TemporaryDirectory() as work_dir:
        old_dir = os.path.join(work_dir, 'old')
        new_dir = os.path.join(work_dir, 'new')

        try:
            run_command(
                ['git', 'clone', repository, old_dir],
                '- repository cloned',
                '- repository cloning failed'
            )
            shutil.copytree(os.path.join(source_dir, path), new_dir)
            shutil.copytree(os.path.join(old_dir, '.git'), os.path.join(new_dir, '.git'))
            print('- new version created')

            os.chdir(new_dir)
            run_command(
                ['git', 'add', '.'],
                '- files added',
                '- "git add" failed'
            )
            run_command(
                ['git', 'config', '--local', 'user.name', 'Update script'],
                '- user name set',
                '- "git config" failed'
            )
            run_command(
                ['git', 'config', '--local', 'user.email', 'robot@example.com'],
                '- user email set',
                '- "git config" failed'
            )
            run_command(
                ['git', 'commit', '-m', commit_msg],
                '- commit created',
                '- "git commit" failed'
            )
            run_command(
                ['git', 'push', '--force'],
                '- pushed',
                '- "git push" failed'
            )
        except CommandException:
            pass

    os.chdir(cwd)


def main():
    if len(sys.argv) != 2:
        print(f"usage: {os.path.basename(__file__)} 'Commit message'", file=sys.stderr)
        sys.exit(1)

    cfg = load_config()

    with TemporaryDirectory() as main_repo_dir:
        run_command(
            ['git', 'clone', cfg['main'], main_repo_dir],
            f'Main repository cloned: {main_repo_dir}',
            'Cloning of the main repository failed.'
        )

        for module, info in cfg['modules'].items():
            update_module(main_repo_dir, module, info['path'], info['repo'], sys.argv[1])


if __name__ == '__main__':
    main()
