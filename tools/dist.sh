set -e
cd `dirname $0`/..

cd docs
sh build.sh
cd ..

TMP_TAR=/tmp/viadat.build.tar

git archive master --prefix=viadat/ > $TMP_TAR
cd ..
tar --append --file=$TMP_TAR viadat/docs/arch.html viadat/docs/install.html viadat/docs/userguide.html
cd viadat
xz -c $TMP_TAR >viadat-0.1.3.tar.xz
rm $TMP_TAR
